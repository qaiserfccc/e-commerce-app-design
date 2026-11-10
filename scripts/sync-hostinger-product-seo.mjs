import pg from 'pg'
import { normalizePostgresConnectionString } from '../lib/db/postgres-connection.mjs'
import {
  collectHostingerSeoImageUrls,
  normalizeHostingerSeo,
} from '../lib/server/hostinger-seo.mjs'
import {
  syncHostingerProductMedia,
  syncHostingerSeoMedia,
} from '../lib/server/isk-catalog-sync.mjs'

const SOURCE_API = 'https://peachpuff-dinosaur-871494.hostingersite.com/wp-json/wp/v2/product'
const PRODUCTION_DATABASE = 'neondb'
const apply = process.argv.includes('--apply')
const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is not configured.')
if (process.env.ISK_CATALOG_SOURCE !== 'hostingerMirror') {
  throw new Error('Run with ISK_CATALOG_SOURCE=hostingerMirror.')
}

const hostname = new URL(databaseUrl).hostname
if (!hostname.endsWith('.neon.tech')) {
  throw new Error('SEO sync only supports the configured production Neon database.')
}

const { Pool } = pg
const pool = new Pool({
  connectionString: normalizePostgresConnectionString(databaseUrl),
  max: 6,
  connectionTimeoutMillis: 10_000,
})

async function fetchSourceProducts() {
  const products = []
  for (let page = 1; page <= 20; page += 1) {
    const url = new URL(SOURCE_API)
    url.searchParams.set('context', 'view')
    url.searchParams.set('per_page', '100')
    url.searchParams.set('page', String(page))
    url.searchParams.set('_fields', 'id,slug,modified_gmt,aioseo_head_json')
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) })
    if (!response.ok) throw new Error(`Hostinger SEO endpoint returned HTTP ${response.status}.`)
    const batch = await response.json()
    if (!Array.isArray(batch)) throw new Error('Hostinger SEO endpoint returned an invalid product list.')
    products.push(...batch)
    const totalPages = Number(response.headers.get('X-WP-TotalPages'))
    if (Number.isFinite(totalPages) && page >= totalPages) return products
    if (batch.length < 100) return products
  }
  throw new Error('Hostinger SEO endpoint exceeded the expected page limit.')
}

async function main() {
  try {
    const [target, sourceProducts] = await Promise.all([
      pool.query(`
        select current_database() as database,
          count(*) filter (where status = 'active')::int as active,
          count(*) filter (where status = 'draft')::int as drafts,
          count(*) filter (where source_product_id is not null and status = 'active')::int as matched_active
        from public.store_products
      `),
      fetchSourceProducts(),
    ])
    if (target.rows[0].database !== PRODUCTION_DATABASE) {
      throw new Error('Connected database is not the expected production Neon database.')
    }

    const productsResult = await pool.query(`
      select id, source_product_id, slug, name, description, seo_title, seo_description
      from public.store_products
      where status = 'active' and source_product_id is not null
      order by source_product_id
    `)
    const sourceById = new Map(sourceProducts.map((product) => [Number(product.id), product]))
    const missingSource = productsResult.rows.filter((product) => !sourceById.has(Number(product.source_product_id)))
    if (missingSource.length || productsResult.rowCount !== target.rows[0].matched_active) {
      throw new Error('Active production products do not match the available Hostinger source catalog.')
    }

    const rows = productsResult.rows.map((product) => {
      const source = sourceById.get(Number(product.source_product_id))
      return { product, source, aioseo: source.aioseo_head_json }
    })
    const imageUrls = [...new Set(rows.flatMap(({ aioseo }) => collectHostingerSeoImageUrls(aioseo)))]
    const existingSeo = await pool.query(`
      select count(*) filter (where seo_title is not null and seo_description is not null)::int as complete
      from public.store_products
      where status = 'active' and source_product_id is not null
    `)
    for (const { aioseo } of rows) {
      if (!aioseo || typeof aioseo.title !== 'string' || !aioseo.title.trim()) {
        throw new Error('A matched Hostinger product is missing its SEO title.')
      }
    }

    console.log(JSON.stringify({
      mode: apply ? 'apply' : 'dry-run',
      database: target.rows[0].database,
      sourceProducts: sourceProducts.length,
      activeMatchedProducts: productsResult.rowCount,
      sourceProductsUnmatched: sourceProducts.length - productsResult.rowCount,
      existingSeoComplete: existingSeo.rows[0].complete,
      seoImagesToRehost: imageUrls.length,
      draftsToArchive: target.rows[0].drafts,
    }))

    if (!apply) return

    process.env.ISK_CATALOG_SOURCE = 'hostingerMirror'
    const blobCache = new Map()
    const productMedia = await syncHostingerProductMedia(pool, blobCache)
    console.log(JSON.stringify({
      productImages: {
        sourceImages: productMedia.sourceImages,
        uploaded: productMedia.uploaded,
        reused: productMedia.reused,
        skipped: productMedia.skipped,
        repaired: productMedia.repaired,
        duplicatesRemoved: productMedia.duplicatesRemoved,
        failures: productMedia.failures.length,
      },
    }))
    if (productMedia.failures.length) {
      throw new Error(`Could not restore ${productMedia.failures.length} source product image(s).`)
    }
    const hostedSeoImages = await syncHostingerSeoMedia(imageUrls, blobCache)
    console.log(JSON.stringify({ seoImagesRehosted: hostedSeoImages.size }))

    const mediaMap = new Map(hostedSeoImages)
    const updates = rows.map(({ product, source, aioseo }) => {
      const normalized = normalizeHostingerSeo(aioseo, product.slug, mediaMap)
      return {
        id: product.id,
        source_product_id: Number(product.source_product_id),
        slug: product.slug,
        title: normalized.title,
        description: normalized.description || product.seo_description || null,
        seo: {
          provider: 'AIOSEO',
          sourceProductId: Number(source.id),
          sourceSlug: source.slug,
          sourceModifiedAt: source.modified_gmt ?? null,
          importedAt: new Date().toISOString(),
          canonicalUrl: normalized.canonicalUrl,
          title: normalized.title,
          description: normalized.description,
          fields: normalized.fields,
        },
      }
    })

    const client = await pool.connect()
    try {
      await client.query('begin')
      const current = await client.query(`
        select count(*) filter (where status = 'active' and source_product_id is not null)::int as matched_active,
          count(*) filter (where status = 'draft')::int as drafts
        from public.store_products
      `)
      if (current.rows[0].matched_active !== updates.length) {
        throw new Error('Active source-product rows changed during the sync; no SEO writes were committed.')
      }
      const updated = await client.query(
        `with input as (
           select * from jsonb_to_recordset($1::jsonb) as row(
             id uuid, source_product_id integer, slug text, title text, description text, seo jsonb
           )
         )
         update public.store_products as product
         set source_payload = jsonb_set(coalesce(product.source_payload, '{}'::jsonb), '{isk_seo}', input.seo, true),
             seo_title = input.title,
             seo_description = coalesce(input.description, product.seo_description),
             updated_at = now()
         from input
         where product.id = input.id
           and product.source_product_id = input.source_product_id
           and product.slug = input.slug
           and product.status = 'active'
         returning product.id`,
        [JSON.stringify(updates)],
      )
      if (updated.rowCount !== updates.length) {
        throw new Error(`Updated ${updated.rowCount} of ${updates.length} active source products; rolling back.`)
      }
      const archived = await client.query(
        `update public.store_products set status = 'archived', updated_at = now()
         where status = 'draft'
         returning id`,
      )
      await client.query('commit')
      console.log(JSON.stringify({
        seoProductsUpdated: updated.rowCount,
        draftsArchived: archived.rowCount,
      }))
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  } finally {
    await pool.end()
  }
}

await main()

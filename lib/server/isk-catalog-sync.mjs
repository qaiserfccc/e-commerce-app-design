import { createHash } from 'node:crypto'
import pg from 'pg'
import { normalizePostgresConnectionString } from '../db/postgres-connection.mjs'
import {
  assertMediaStorageConfigured,
  getMediaPublicUrl,
  mediaObjectExists,
  uploadMedia,
} from './media-storage.mjs'

const { Pool } = pg
const API = 'https://isklenses.com/wp-json/wc/store/v1'
const ALLOWED_HOSTS = new Set(['isklenses.com', 'www.isklenses.com'])
const PAGE_SIZE = 100
const IMAGE_LIMIT = 12 * 1024 * 1024
const IMAGE_CONCURRENCY = 5
const ROOT_CATEGORY_NAMES = new Set(['all products', 'new arrival', 'deals', 'limited time deals'])

function htmlText(value = '') {
  const decodeCodePoint = (raw, radix) => {
    const codePoint = Number.parseInt(raw, radix)
    return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff &&
      (codePoint < 0xd800 || codePoint > 0xdfff) ? String.fromCodePoint(codePoint) : ' '
  }
  return String(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#0*160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&#0*34;/gi, '"')
    .replace(/&apos;|&#0*39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => decodeCodePoint(code, 16))
    .replace(/&#([0-9]+);/g, (_, code) => decodeCodePoint(code, 10))
    .replace(/\s+/g, ' ')
    .trim()
}

async function recordSyncFailures(pool, entity, failures) {
  if (!failures.length) return
  const redact = (value) => value.replace(
    /\b(password|token|secret|authorization|cookie|api[-_ ]?key)\b(\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,
    '$1$2[REDACTED]',
  )
  const messages = failures.map(({ name, reason }) =>
    redact(`${entity}: ${name}: ${reason}`).slice(0, 4000),
  )
  await pool.query(`delete from public.store_error_logs where created_at < now() - interval '1 day'`)
  await pool.query(
    `insert into public.store_error_logs (source, error_name, message)
     select 'catalog-sync', 'CatalogSyncItemError', entry
     from unnest($1::text[]) as entries(entry)`,
    [messages],
  )
}

function brandFromDescription(description = '') {
  const match = String(description).match(/<td\b(?=[^>]*\bid=["']brand-name-description["'])[^>]*>([\s\S]*?)<\/td>/i)
  return match ? htmlText(match[1]).slice(0, 100) || null : null
}

function slugify(value, max = 80) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max).replace(/-+$/g, '')
}

function stableHash(value) {
  return createHash('sha256').update(value).digest('hex')
}

function brandSlug(name) {
  return `${slugify(name, 68) || 'brand'}-${stableHash(name.toLowerCase()).slice(0, 8)}`
}

function getSafeSourceUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname) ||
        !url.pathname.startsWith('/wp-content/uploads/') || url.username || url.password) return null
    return url
  } catch {
    return null
  }
}

function imageExtension(bytes, contentType) {
  const type = contentType.split(';', 1)[0].trim().toLowerCase()
  if (type === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg'
  if (type === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png'
  if (type === 'image/webp' && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'webp'
  const ftyp = bytes.toString('ascii', 4, 8) === 'ftyp'
  const brand = bytes.toString('ascii', 8, 12)
  if (type === 'image/avif' && ftyp && (brand === 'avif' || brand === 'avis')) return 'avif'
  if (type === 'image/gif' && ['GIF87a', 'GIF89a'].includes(bytes.toString('ascii', 0, 6))) return 'gif'
  throw new Error('The ISK source did not return a supported image.')
}

async function getJson(url) {
  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(25_000) })
      if (response.ok) return await response.json()
      const error = new Error(`ISK catalog returned HTTP ${response.status}.`)
      if (response.status < 500 && response.status !== 429) throw error
      lastError = error
    } catch (error) {
      lastError = error
      if (error instanceof Error && /^ISK catalog returned HTTP 4/.test(error.message)) throw error
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 700))
  }
  throw lastError ?? new Error('Could not fetch the ISK catalog.')
}

async function readPages(resource) {
  const all = []
  for (let page = 1; ; page += 1) {
    const rows = await getJson(`${API}/${resource}?per_page=${PAGE_SIZE}&page=${page}`)
    if (!Array.isArray(rows)) throw new Error(`ISK catalog returned invalid ${resource} data.`)
    all.push(...rows)
    if (rows.length < PAGE_SIZE) return all
  }
}

async function fetchCatalog() {
  const [products, categories] = await Promise.all([
    readPages('products'),
    readPages('products/categories'),
  ])
  if (!products.length || !categories.length) throw new Error('The ISK catalog returned no products or categories; nothing was changed.')
  return { products, categories }
}

async function readImage(url) {
  let current = getSafeSourceUrl(url)
  if (!current) throw new Error('Image URL is not on the approved ISK media host.')
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    const response = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(25_000),
      headers: { Accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif', 'User-Agent': 'ISK-Lenses-Catalog-Sync/1.0' },
    })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location || redirect === 3) throw new Error('The source image redirected too many times.')
      current = getSafeSourceUrl(new URL(location, current).toString())
      if (!current) throw new Error('The source image redirected outside the approved ISK media host.')
      continue
    }
    if (!response.ok) throw new Error(`The source image returned HTTP ${response.status}.`)
    const contentLength = Number(response.headers.get('content-length') ?? 0)
    if (contentLength > IMAGE_LIMIT) throw new Error('The source image exceeds the 12 MB limit.')
    if (!response.body) throw new Error('The source image response was empty.')
    const reader = response.body.getReader()
    const chunks = []
    let size = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > IMAGE_LIMIT) {
        await reader.cancel()
        throw new Error('The source image exceeds the 12 MB limit.')
      }
      chunks.push(Buffer.from(value))
    }
    const bytes = Buffer.concat(chunks, size)
    const contentType = response.headers.get('content-type') ?? ''
    const extension = imageExtension(bytes, contentType)
    return { bytes, contentType: contentType.split(';', 1)[0].trim().toLowerCase(), extension }
  }
  throw new Error('The source image could not be downloaded.')
}

async function findMedia(pathname) {
  return await mediaObjectExists(pathname)
    ? { pathname, url: getMediaPublicUrl(pathname) }
    : null
}

async function ensureBlob(url, cache) {
  const sourceUrl = getSafeSourceUrl(url)
  if (!sourceUrl) throw new Error('Image URL is not on the approved ISK media host.')
  const canonicalUrl = sourceUrl.toString()
  if (cache.has(canonicalUrl)) {
    return cache.get(canonicalUrl).then((blob) => ({ ...blob, reused: true }))
  }
  const pending = (async () => {
    const pathname = `catalog-reference/${stableHash(canonicalUrl)}`
    const existing = await findMedia(pathname)
    if (existing) return { url: existing.url, pathname: existing.pathname, reused: true }
    const { bytes, contentType } = await readImage(canonicalUrl)
    try {
      const media = await uploadMedia(pathname, bytes, contentType)
      return { url: media.url, pathname: media.pathname, reused: false }
    } catch (error) {
      const uploadedBeforeRetry = await findMedia(pathname)
      if (uploadedBeforeRetry) return { url: uploadedBeforeRetry.url, pathname: uploadedBeforeRetry.pathname, reused: true }
      throw error
    }
  })()
  cache.set(canonicalUrl, pending)
  pending.catch(() => {
    if (cache.get(canonicalUrl) === pending) cache.delete(canonicalUrl)
  })
  return pending
}

async function mapConcurrent(items, concurrency, callback) {
  const results = new Array(items.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await callback(items[index], index)
    }
  }))
  return results
}

function categoryDepth(category, categoriesById) {
  let depth = 0
  let current = category
  const seen = new Set()
  while (current && current.parent && !seen.has(current.id)) {
    seen.add(current.id)
    current = categoriesById.get(current.parent)
    if (current) depth += 1
  }
  return depth
}

function categorySlug(category, existingBySlug) {
  const base = slugify(category.slug || category.name)
  const slug = base || `isk-category-${category.id}`
  const occupant = existingBySlug.get(slug)
  return occupant && occupant.sourceCategoryId !== category.id
    ? `${slug.slice(0, 62)}-isk-${category.id}`
    : slug
}

async function syncCategoryData(pool, categories, blobCache) {
  const categoriesById = new Map(categories.map((category) => [category.id, category]))
  const existingResult = await pool.query('select id, slug, source_category_id from public.store_categories')
  const existingBySlug = new Map(existingResult.rows.map((row) => [row.slug, row]))
  const sorted = [...categories].sort((a, b) =>
    categoryDepth(a, categoriesById) - categoryDepth(b, categoriesById) || a.id - b.id,
  )
  const ids = new Map()
  let created = 0
  let updated = 0
  let skipped = 0
  let images = 0
  const imageFailures = []

  for (const category of sorted) {
    if (!Number.isSafeInteger(category.id) || !category.name?.trim()) {
      skipped += 1
      continue
    }
    const name = category.name.trim().slice(0, 120)
    const sourceSlug = categorySlug(category, existingBySlug)
    const parentId = category.parent ? ids.get(category.parent) ?? null : null
    const existing = await pool.query(
      `select id, slug, name, parent_id, image_url, source_image_url, sort_order
       from public.store_categories where source_category_id = $1 limit 1`,
      [category.id],
    )
    let imageUrl = existing.rows[0]?.image_url ?? null
    let sourceImageUrl = category.image?.src ?? null
    if (sourceImageUrl && getSafeSourceUrl(sourceImageUrl)) {
      const previous = existing.rows[0]?.source_image_url
      if (previous !== sourceImageUrl || !imageUrl) {
        try {
          const blob = await ensureBlob(sourceImageUrl, blobCache)
          imageUrl = blob.url
          images += blob.reused ? 0 : 1
        } catch (error) {
          imageFailures.push({ name, reason: error instanceof Error ? error.message : 'Image download failed.' })
          sourceImageUrl = previous
        }
      }
    } else {
      sourceImageUrl = existing.rows[0]?.source_image_url ?? null
    }

    const sortOrder = Number.isSafeInteger(category.menu_order) ? category.menu_order : 0
    const changed = !existing.rows[0] ||
      existing.rows[0].slug !== sourceSlug ||
      existing.rows[0].name !== name ||
      existing.rows[0].parent_id !== parentId ||
      existing.rows[0].image_url !== imageUrl ||
      existing.rows[0].source_image_url !== sourceImageUrl ||
      existing.rows[0].sort_order !== sortOrder
    const result = await pool.query(
      `insert into public.store_categories
        (source_category_id, name, slug, parent_id, image_url, source_image_url, sort_order, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,now())
       on conflict (source_category_id) do update set
         name = excluded.name, slug = excluded.slug, parent_id = excluded.parent_id,
         image_url = coalesce(excluded.image_url, store_categories.image_url),
         source_image_url = coalesce(excluded.source_image_url, store_categories.source_image_url),
         sort_order = excluded.sort_order, updated_at = now()
       where (store_categories.name, store_categories.slug, store_categories.parent_id,
              store_categories.image_url, store_categories.source_image_url, store_categories.sort_order)
         is distinct from (excluded.name, excluded.slug, excluded.parent_id,
              coalesce(excluded.image_url, store_categories.image_url),
              coalesce(excluded.source_image_url, store_categories.source_image_url), excluded.sort_order)
       returning id, (xmax = 0) as inserted`,
      [category.id, name, sourceSlug, parentId, imageUrl, sourceImageUrl, sortOrder],
    )
    const categoryId = result.rows[0]?.id ?? existing.rows[0]?.id
    if (!categoryId) throw new Error(`Could not resolve the synced category ${name}.`)
    ids.set(category.id, categoryId)
    existingBySlug.set(sourceSlug, { id: categoryId, slug: sourceSlug, sourceCategoryId: category.id })
    if (result.rows[0]?.inserted) created += 1
    else if (changed) updated += 1
    else skipped += 1
  }
  await recordSyncFailures(pool, 'categories', imageFailures)
  return { entity: 'categories', source: categories.length, created, updated, skipped, images, imageFailures }
}

async function syncBrandData(pool, products) {
  const counts = new Map()
  for (const product of products) {
    const name = brandFromDescription(product.description)
    if (!name) continue
    const key = name.toLowerCase()
    const variants = counts.get(key) ?? new Map()
    variants.set(name, (variants.get(name) ?? 0) + 1)
    counts.set(key, variants)
  }
  const brands = [...counts.values()].map((variants) =>
    [...variants.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0],
  )
  if (!brands.length) throw new Error('ISK brand labels were not found; no brand records were changed.')
  let created = 0
  for (const name of brands) {
    const result = await pool.query(
      `insert into public.store_brands (name, slug)
       values ($1,$2)
       on conflict (lower(name)) do nothing
       returning id`,
      [name, brandSlug(name)],
    )
    created += result.rowCount ?? 0
  }
  await pool.query(`
    update public.store_products as product
    set brand_id = brand.id
    from public.store_brands as brand
    where product.brand_id is null and product.brand is not null
      and lower(trim(product.brand)) = lower(brand.name)
  `)
  return { entity: 'brands', source: brands.length, created, updated: 0, skipped: brands.length - created, logos: 0 }
}

function formatPrice(minorValue, places) {
  if (!/^\d+$/.test(String(minorValue ?? '')) || !Number.isInteger(places) || places < 0 || places > 6) return null
  const raw = BigInt(minorValue).toString().padStart(places + 1, '0')
  if (!places) return raw
  return `${raw.slice(0, -places)}.${raw.slice(-places)}`
}

function productPrice(product) {
  const prices = product.prices
  if (!prices) return null
  const places = Number(prices.currency_minor_unit ?? 2)
  const price = formatPrice(prices.price, places)
  const regular = formatPrice(prices.regular_price, places)
  if (price === null) return null
  return { price, compareAtPrice: regular && BigInt(prices.regular_price) > BigInt(prices.price) ? regular : null, places }
}

function relevantCategories(product, categoriesById, categoryIds) {
  const records = (product.categories ?? [])
    .map((category) => categoriesById.get(category.id))
    .filter((category) => category && categoryIds.has(category.id))
  const specific = records.filter((category) => {
    const normalized = category.name.trim().toLowerCase()
    return !ROOT_CATEGORY_NAMES.has(normalized) && categoryDepth(category, categoriesById) > 0
  })
  return (specific.length ? specific : records)
    .sort((a, b) => categoryDepth(b, categoriesById) - categoryDepth(a, categoriesById) || a.id - b.id)
}

async function syncProductRows(pool, products, categories, categoryResult) {
  const categoryIds = new Set(categoryResult.ids.keys())
  const categoriesById = new Map(categories.map((category) => [category.id, category]))
  const categoryDbIds = new Map()
  const categoryRows = await pool.query('select id, source_category_id from public.store_categories where source_category_id is not null')
  for (const row of categoryRows.rows) categoryDbIds.set(row.source_category_id, row.id)
  const brandRows = await pool.query('select id, name from public.store_brands')
  const brandsByName = new Map(brandRows.rows.map((row) => [row.name.toLowerCase(), row.id]))
  const shadeRows = await pool.query('select id, name from public.store_lens_shades')
  const shadesByName = new Map(shadeRows.rows.map((row) => [row.name.toLowerCase(), row.id]))
  const existingSourceIds = await pool.query('select source_product_id, id from public.store_products where source_product_id is not null')
  const productsBySourceId = new Map(existingSourceIds.rows.map((row) => [row.source_product_id, row.id]))
  const existingUnlinked = await pool.query(
    `select id, name, brand, slug from public.store_products where source_product_id is null`,
  )
  const claimedUnlinkedIds = new Set()
  let created = 0
  let updated = 0
  let skipped = 0
  const failures = []
  const mediaRows = []

  for (const product of products) {
    if (!Number.isSafeInteger(product.id) || !product.name?.trim()) {
      skipped += 1
      continue
    }
    const sourceCategoryRows = relevantCategories(product, categoriesById, categoryIds)
    const productCategories = sourceCategoryRows.map((category) => ({
      sourceId: category.id,
      databaseId: categoryDbIds.get(category.id),
    })).filter((category) => category.databaseId)
    const price = productPrice(product)
    if (!productCategories.length || !price) {
      skipped += 1
      failures.push({ name: product.name, reason: !price ? 'Source price is missing or invalid.' : 'No category could be assigned.' })
      continue
    }

    const brand = brandFromDescription(product.description)
    const brandId = brand ? brandsByName.get(brand.toLowerCase()) ?? null : null
    const name = htmlText(product.name).slice(0, 200)
    const sourceSlug = slugify(product.slug || name, 110) || `isk-product-${product.id}`
    const productSlug = `${sourceSlug.slice(0, 100)}-${product.id}`
    const description = htmlText(product.description).slice(0, 10000) || null
    const shortDescription = htmlText(product.short_description).slice(0, 400) || null
    const currency = /^[A-Z]{3}$/.test(product.prices?.currency_code ?? '') ? product.prices.currency_code : 'PKR'
    const categoryId = productCategories[0].databaseId
    const candidate = productsBySourceId.get(product.id)
      ? { id: productsBySourceId.get(product.id), sourcePayload: null, sourceContentHash: null }
      : null
    let productId = candidate?.id
    let previousPayload = null
    let previousHash = null
    if (productId) {
      const existing = await pool.query('select source_payload, source_content_hash from public.store_products where id = $1', [productId])
      previousPayload = existing.rows[0]?.source_payload
      previousHash = existing.rows[0]?.source_content_hash
    } else if (brand) {
      const matches = existingUnlinked.rows.filter((row) =>
        !claimedUnlinkedIds.has(row.id) &&
        row.name.trim().toLowerCase() === name.toLowerCase() &&
        row.brand?.trim().toLowerCase() === brand.toLowerCase(),
      )
      if (matches.length === 1) {
        productId = matches[0].id
        claimedUnlinkedIds.add(productId)
      }
    }

    const payload = { ...product, categories: (product.categories ?? []).map((category) => ({ id: category.id })) }
    const contentHash = stableHash(JSON.stringify(payload))
    if (productId && previousHash === contentHash) {
      skipped += 1
    } else if (productId) {
      const client = await pool.connect()
      try {
        await client.query('begin')
        await client.query(
          `update public.store_products set
             source_product_id = $2, source_url = $3, source_payload = $4, source_content_hash = $5,
             name = $6, category_id = $7, brand = $8, brand_id = $9, price = $10, compare_at_price = $11,
             currency = $12, description = $13, short_description = $14, updated_at = now()
           where id = $1`,
          [productId, product.id, product.permalink ?? null, JSON.stringify(payload), contentHash,
            name, categoryId, brand, brandId, price.price, price.compareAtPrice, currency,
            description, shortDescription],
        )
        await client.query('commit')
        updated += 1
      } catch (error) {
        await client.query('rollback')
        failures.push({ name, reason: error instanceof Error ? error.message : 'Database update failed.' })
        continue
      } finally {
        client.release()
      }
    } else {
      const images = product.images ?? []
      const firstSourceImage = getSafeSourceUrl(images[0]?.src)?.toString() ?? null
      const insert = await pool.query(
        `insert into public.store_products
          (source_product_id, source_url, source_payload, source_content_hash, source_image_url,
           name, slug, description, short_description, category_id, brand_id, brand, price,
           compare_at_price, currency, status, stock_quantity)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'draft',0)
         on conflict (source_product_id) do nothing
         returning id`,
        [product.id, product.permalink ?? null, JSON.stringify(payload), contentHash, firstSourceImage,
          name, productSlug, description, shortDescription, categoryId, brandId, brand, price.price,
          price.compareAtPrice, currency],
      )
      if (insert.rows[0]) {
        productId = insert.rows[0].id
        const client = await pool.connect()
        try {
          await client.query(
            `insert into public.store_product_categories (product_id, category_id)
             select $1, unnest($2::uuid[]) on conflict do nothing`,
            [productId, productCategories.map((category) => category.databaseId)],
          )
          created += 1
        } finally {
          client.release()
        }
      } else {
        const existing = await pool.query('select id from public.store_products where source_product_id = $1', [product.id])
        productId = existing.rows[0]?.id
        skipped += 1
      }
    }

    if (!productId) continue
    const oldSourceCategoryIds = (previousPayload?.categories ?? [])
      .map((category) => category.id)
      .filter(Number.isSafeInteger)
    const categoryClient = await pool.connect()
    try {
      await categoryClient.query('begin')
      if (oldSourceCategoryIds.length) {
        await categoryClient.query(
          `delete from public.store_product_categories pc
           using public.store_categories c
           where pc.product_id = $1 and pc.category_id = c.id
             and c.source_category_id = any($2::integer[])
             and not (c.source_category_id = any($3::integer[]))`,
          [productId, oldSourceCategoryIds, productCategories.map((category) => category.sourceId)],
        )
      }
      await categoryClient.query(
        `insert into public.store_product_categories (product_id, category_id)
         select $1, unnest($2::uuid[]) on conflict do nothing`,
        [productId, productCategories.map((category) => category.databaseId)],
      )
      await categoryClient.query('commit')
    } catch (error) {
      await categoryClient.query('rollback')
      failures.push({ name, reason: error instanceof Error ? error.message : 'Category links could not be updated.' })
      continue
    } finally {
      categoryClient.release()
    }
    productsBySourceId.set(product.id, productId)
    const sourceImages = (product.images ?? [])
      .map((image, index) => ({ image, index, url: getSafeSourceUrl(image.src)?.toString() }))
      .filter((row) => row.url)
    mediaRows.push(...sourceImages.map((row) => ({
      productId,
      productName: name,
      url: row.url,
      altText: htmlText(row.image.name || name).slice(0, 500),
      sortOrder: row.index,
      isHero: row.index === 0,
    })))
  }
  await recordSyncFailures(pool, 'products', failures)
  return { created, updated, skipped, failures, mediaRows }
}

async function syncProductMedia(pool, rows, blobCache) {
  const existingRows = await pool.query('select product_id, blob_pathname, blob_url from public.store_product_assets')
  const existing = new Set(existingRows.rows.map((row) => `${row.product_id}:${row.blob_pathname}`))
  let uploaded = 0
  let reused = 0
  let skipped = 0
  const failures = []
  await mapConcurrent(rows, IMAGE_CONCURRENCY, async (row) => {
    const pathname = `catalog-reference/${stableHash(row.url)}`
    if (existing.has(`${row.productId}:${pathname}`)) {
      skipped += 1
      return
    }
    const legacyPrefix = `products/${row.productId}/catalog-${stableHash(row.url)}.`
    const legacyAsset = existingRows.rows.find((asset) =>
      asset.product_id === row.productId && asset.blob_url && asset.blob_pathname.startsWith(legacyPrefix),
    )
    if (legacyAsset) {
      try {
        if (row.isHero) {
          await pool.query(
            `update public.store_products set
               hero_image_url = case when hero_image_url is null or
                 (hero_image_url ~ '/catalog-reference/' and source_image_url is distinct from $3)
                 then $2 else hero_image_url end,
               source_image_url = $3, updated_at = now()
             where id = $1`,
            [row.productId, legacyAsset.blob_url, row.url],
          )
        }
        skipped += 1
      } catch (error) {
        failures.push({ name: row.productName, image: row.sortOrder + 1, reason: error instanceof Error ? error.message : 'Image sync failed.' })
      }
      return
    }
    try {
      const blob = await ensureBlob(row.url, blobCache)
      const client = await pool.connect()
      try {
        await client.query('begin')
        const inserted = await client.query(
          `insert into public.store_product_assets
            (product_id, blob_pathname, blob_url, alt_text, media_type, sort_order)
           values ($1,$2,$3,$4,'image',$5)
           on conflict (product_id, blob_pathname) do nothing
           returning id`,
          [row.productId, blob.pathname, blob.url, row.altText, row.sortOrder],
        )
        await client.query(
          `update public.store_products set
             hero_image_url = case
               when $4 and (hero_image_url is null or
                 (hero_image_url ~ '/catalog-reference/' and source_image_url is distinct from $3)) then $2
               else hero_image_url
             end,
             source_image_url = case when $4 then $3 else source_image_url end,
             updated_at = now()
           where id = $1`,
          [row.productId, blob.url, row.url, row.isHero],
        )
        await client.query('commit')
        if (inserted.rowCount) {
          if (blob.reused) reused += 1
          else uploaded += 1
          existing.add(`${row.productId}:${pathname}`)
        } else {
          skipped += 1
        }
      } catch (error) {
        await client.query('rollback')
        throw error
      } finally {
        client.release()
      }
    } catch (error) {
      failures.push({ name: row.productName, image: row.sortOrder + 1, reason: error instanceof Error ? error.message : 'Image sync failed.' })
    }
  })
  await recordSyncFailures(pool, 'product-images', failures)
  return { uploaded, reused, skipped, failures }
}

function lensCategoryMap(categories) {
  const byId = new Map(categories.map((category) => [category.id, category]))
  const roots = new Set(categories.filter((category) =>
    category.parent === 0 &&
    ['contact lenses', 'comfort lenses'].includes(category.name.trim().toLowerCase()),
  ).map((category) => category.id))
  if (!roots.size) throw new Error('ISK did not return Contact Lenses or Comfort Lenses; lens lookups were not changed.')
  function rootFor(categoryIds) {
    const matches = new Set()
    for (const categoryId of categoryIds) {
      let current = byId.get(categoryId)
      const seen = new Set()
      while (current && !seen.has(current.id)) {
        if (roots.has(current.id)) matches.add(current.id)
        seen.add(current.id)
        current = byId.get(current.parent)
      }
    }
    return [...matches].sort((a, b) => a - b)[0] ?? null
  }
  return { roots, rootFor, isLens: (categoryIds) => rootFor(categoryIds) !== null }
}

async function syncLensTypeData(pool, products, categories) {
  const { roots, rootFor } = lensCategoryMap(categories)
  const rootsById = new Map(categories.filter((category) => roots.has(category.id)).map((category) => [category.id, category]))
  const typeIds = new Map()
  let created = 0
  let updated = 0
  let skipped = 0

  for (const categoryId of [...roots].sort((a, b) => a - b)) {
    const category = rootsById.get(categoryId)
    if (!category || !Number.isSafeInteger(category.id) || !category.name?.trim()) continue
    const name = category.name.trim().slice(0, 100)
    const prior = await pool.query(
      'select id, name, source_category_id from public.store_lens_types where source_category_id=$1 or lower(name)=lower($2) order by (source_category_id=$1) desc limit 1',
      [categoryId, name],
    )
    let row
    if (prior.rows[0]) {
      const current = prior.rows[0]
      const result = await pool.query(
        `update public.store_lens_types set name=$2, source_category_id=$3, updated_at=now()
         where id=$1 and (name, source_category_id) is distinct from ($2, $3)
         returning id`,
        [current.id, name, categoryId],
      )
      row = { id: current.id }
      if (result.rowCount) updated += 1
      else skipped += 1
    } else {
      const result = await pool.query(
        `insert into public.store_lens_types (name, source_category_id)
         values ($1,$2) on conflict (source_category_id)
         where source_category_id is not null do update set
         name=excluded.name, updated_at=now()
         where store_lens_types.name is distinct from excluded.name
         returning id`,
        [name, categoryId],
      )
      if (result.rows[0]) {
        row = result.rows[0]
        created += 1
      } else {
        const existing = await pool.query('select id from public.store_lens_types where source_category_id=$1', [categoryId])
        row = existing.rows[0]
        skipped += 1
      }
    }
    if (!row?.id) throw new Error(`Could not resolve the synced lens type ${name}.`)
    typeIds.set(categoryId, row.id)
  }

  let linked = 0
  for (const product of products) {
    if (!Number.isSafeInteger(product.id)) continue
    const sourceTypeId = rootFor((product.categories ?? []).map((category) => category.id))
    const typeId = sourceTypeId ? typeIds.get(sourceTypeId) : null
    if (!typeId) continue
    const result = await pool.query(
      `update public.store_products set lens_type_id=$2
       where source_product_id=$1 and lens_type_id is distinct from $2`,
      [product.id, typeId],
    )
    linked += result.rowCount ?? 0
  }
  const count = await pool.query('select count(*)::int as total from public.store_lens_types')
  return { entity: 'lens-types', source: roots.size, created, updated, skipped, linked, total: count.rows[0].total }
}

async function syncShadeData(pool, products, categories, blobCache) {
  const { isLens } = lensCategoryMap(categories)
  const variants = new Map()
  for (const product of products) {
    if (!isLens((product.categories ?? []).map((category) => category.id))) continue
    const brand = brandFromDescription(product.description)
    const name = htmlText(product.name).slice(0, 80)
    if (!brand || !name) continue
    const key = name.toLowerCase()
    const entry = variants.get(key) ?? { counts: new Map(), products: [] }
    entry.counts.set(name, (entry.counts.get(name) ?? 0) + 1)
    entry.products.push(product)
    variants.set(key, entry)
  }
  if (!variants.size) throw new Error('No branded lens products were found; lens shades were not changed.')

  let created = 0
  let linked = 0
  let imagesUploaded = 0
  let imagesReused = 0
  let imagesSkipped = 0
  const imageFailures = []
  for (const [key, entry] of variants) {
    const name = [...entry.counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0]
    const result = await pool.query(
      `insert into public.store_lens_shades (name, hex)
       select $1, null
       where not exists (select 1 from public.store_lens_shades where lower(name) = $2)
       on conflict do nothing
       returning id`,
      [name, key],
    )
    created += result.rowCount ?? 0
    const shadeResult = await pool.query(
      `select id, image_url, source_image_url from public.store_lens_shades
       where lower(name) = $1 order by (hex is null) desc, created_at asc limit 1`,
      [key],
    )
    const shade = shadeResult.rows[0]
    if (!shade) continue

    const shadeProducts = entry.products
      .filter((product) => Number.isSafeInteger(product.id))
      .sort((a, b) => a.id - b.id)
    const representative = shadeProducts[0]
    const sourceImageUrl = getSafeSourceUrl(representative?.images?.[0]?.src)?.toString() ?? null
    if (sourceImageUrl && (shade.source_image_url !== sourceImageUrl || !shade.image_url)) {
      try {
        const blob = await ensureBlob(sourceImageUrl, blobCache)
        await pool.query(
          `update public.store_lens_shades set image_url=$2, source_image_url=$3, updated_at=now()
           where id=$1`,
          [shade.id, blob.url, sourceImageUrl],
        )
        if (blob.reused) imagesReused += 1
        else imagesUploaded += 1
      } catch (error) {
        imageFailures.push({ name, reason: error instanceof Error ? error.message : 'Shade image sync failed.' })
      }
    } else {
      imagesSkipped += 1
    }

    if (shadeProducts.length) {
      const ids = shadeProducts.map((product) => product.id)
      const update = await pool.query(
        `update public.store_products set lens_shade_id=$2
         where source_product_id = any($1::integer[]) and brand_id is not null
           and lens_shade_id is distinct from $2`,
        [ids, shade.id],
      )
      linked += update.rowCount ?? 0
    }
  }
  const count = await pool.query('select count(*)::int as total from public.store_lens_shades')
  await recordSyncFailures(pool, 'lens-shades', imageFailures)
  return {
    entity: 'lens-shades',
    source: variants.size,
    created,
    updated: 0,
    skipped: variants.size - created,
    linked,
    total: count.rows[0].total,
    imagesUploaded,
    imagesReused,
    imagesSkipped,
    imageFailures,
  }
}

async function syncProducts(pool, blobCache) {
  const { products, categories } = await fetchCatalog()
  const categoryStats = await syncCategoryData(pool, categories, blobCache)
  categoryStats.ids = new Map()
  const categoryRows = await pool.query('select source_category_id, id from public.store_categories where source_category_id is not null')
  for (const row of categoryRows.rows) categoryStats.ids.set(row.source_category_id, row.id)
  const brandStats = await syncBrandData(pool, products)
  const synced = await syncProductRows(pool, products, categories, categoryStats)
  const lensTypeStats = await syncLensTypeData(pool, products, categories)
  const media = await syncProductMedia(pool, synced.mediaRows, blobCache)
  const shadeStats = await syncShadeData(pool, products, categories, blobCache)
  const { ids: _categoryIds, ...categoryResponse } = categoryStats
  return {
    entity: 'products',
    source: products.length,
    created: synced.created,
    updated: synced.updated,
    skipped: synced.skipped,
    imagesUploaded: categoryStats.images + media.uploaded + shadeStats.imagesUploaded,
    imagesReused: media.reused + shadeStats.imagesReused,
    imagesSkipped: media.skipped + shadeStats.imagesSkipped,
    failed: synced.failures.length + media.failures.length + shadeStats.imageFailures.length +
      categoryStats.imageFailures.length,
    failures: [...synced.failures, ...media.failures, ...shadeStats.imageFailures].slice(0, 30),
    prerequisiteSyncs: [categoryResponse, brandStats, lensTypeStats],
    lensTypeSync: lensTypeStats,
    shadeSync: shadeStats,
  }
}

async function syncEntity(pool, entity, blobCache) {
  if (entity === 'categories') {
    const categories = await readPages('products/categories')
    if (!categories.length) throw new Error('The ISK catalog returned no categories; nothing was changed.')
    return syncCategoryData(pool, categories, blobCache)
  }
  if (entity === 'brands') {
    const products = await readPages('products')
    if (!products.length) throw new Error('The ISK catalog returned no products; nothing was changed.')
    return syncBrandData(pool, products)
  }
  if (entity === 'products') return syncProducts(pool, blobCache)
  if (entity === 'lens-shades') {
    const [products, categories] = await Promise.all([readPages('products'), readPages('products/categories')])
    if (!products.length || !categories.length) throw new Error('The ISK catalog returned incomplete data; shades were not changed.')
    return syncShadeData(pool, products, categories, blobCache)
  }
  if (entity === 'lens-types') {
    const [products, categories] = await Promise.all([readPages('products'), readPages('products/categories')])
    if (!products.length || !categories.length) throw new Error('ISK catalog returned incomplete data; lens types were not changed.')
    return syncLensTypeData(pool, products, categories)
  }
  throw new Error('Choose products, brands, categories, lens-shades, lens-types, or all.')
}

export async function syncIskCatalog(entity) {
  const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('Database connection is not configured.')
  assertMediaStorageConfigured()
  const pool = new Pool({ connectionString: normalizePostgresConnectionString(databaseUrl), max: 8, connectionTimeoutMillis: 10_000 })
  const blobCache = new Map()
  try {
    if (entity === 'all') {
      const products = await syncProducts(pool, blobCache)
      const categories = products.prerequisiteSyncs[0]
      const brands = products.prerequisiteSyncs[1]
      const shades = products.shadeSync
      const lensTypes = products.prerequisiteSyncs[2]
      return { results: [products, brands, categories, shades, lensTypes] }
    }
    return { results: [await syncEntity(pool, entity, blobCache)] }
  } finally {
    await pool.end()
  }
}

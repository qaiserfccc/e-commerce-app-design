#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { put } from '@vercel/blob'
import { Pool } from 'pg'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required.')
if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN is required.')

const maxImageBytes = 12 * 1024 * 1024
const allowedHosts = new Set(['isklenses.com', 'www.isklenses.com'])
const concurrency = 4
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : Number.POSITIVE_INFINITY
if (!(limit > 0) || (!Number.isSafeInteger(limit) && limit !== Number.POSITIVE_INFINITY)) {
  throw new Error('Use a positive whole number for --limit.')
}

function safeSourceUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname) ||
        !url.pathname.startsWith('/wp-content/uploads/') || url.username || url.password) return null
    return url
  } catch {
    return null
  }
}

function detectImage(bytes, contentType) {
  const type = contentType.split(';', 1)[0].trim().toLowerCase()
  if (type === 'image/jpeg' && bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return ['jpg', type]
  if (type === 'image/png' && bytes.length >= 8 && Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return ['png', type]
  if (type === 'image/webp' && bytes.length >= 12 && Buffer.from(bytes.subarray(0, 4)).toString('ascii') === 'RIFF' && Buffer.from(bytes.subarray(8, 12)).toString('ascii') === 'WEBP') return ['webp', type]
  if (type === 'image/avif' && bytes.length >= 12 && Buffer.from(bytes.subarray(4, 8)).toString('ascii') === 'ftyp' && ['avif', 'avis'].includes(Buffer.from(bytes.subarray(8, 12)).toString('ascii'))) return ['avif', type]
  if (type === 'image/gif' && bytes.length >= 6 && ['GIF87a', 'GIF89a'].includes(Buffer.from(bytes.subarray(0, 6)).toString('ascii'))) return ['gif', type]
  throw new Error('The source response is not a supported image file.')
}

async function readBoundedImage(response) {
  const declaredLength = Number(response.headers.get('content-length') ?? 0)
  if (declaredLength > maxImageBytes) throw new Error('The source image exceeds the 12 MB limit.')
  if (!response.body) throw new Error('The source image response is empty.')
  const reader = response.body.getReader()
  const chunks = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > maxImageBytes) {
      await reader.cancel()
      throw new Error('The source image exceeds the 12 MB limit.')
    }
    chunks.push(Buffer.from(value))
  }
  return Buffer.concat(chunks, size)
}

async function fetchImage(initialUrl) {
  let url = initialUrl
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(20_000),
      headers: { Accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif', 'User-Agent': 'ISK-Lenses-Catalog-Media-Sync/1.0' },
    })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location || redirect === 3) throw new Error('The source image redirected too many times.')
      const nextUrl = safeSourceUrl(new URL(location, url).toString())
      if (!nextUrl) throw new Error('The source image redirected outside the approved ISK Lenses media host.')
      url = nextUrl
      continue
    }
    if (!response.ok) throw new Error(`The source image returned HTTP ${response.status}.`)
    const bytes = await readBoundedImage(response)
    const [extension, contentType] = detectImage(bytes, response.headers.get('content-type') ?? '')
    return { bytes, extension, contentType }
  }
  throw new Error('The source image could not be downloaded.')
}

const pool = new Pool({ connectionString: databaseUrl })
let uploaded = 0
let skipped = 0
let failed = 0
const failures = []

try {
  const result = await pool.query(`
    SELECT p.id AS product_id, p.name AS product_name, p.source_product_id,
      image.value->>'src' AS source_url,
      COALESCE(NULLIF(image.value->>'name', ''), p.name) AS alt_text,
      (image.ordinality - 1)::integer AS sort_order
    FROM store_products p
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(p.source_payload->'images') = 'array'
        THEN p.source_payload->'images' ELSE '[]'::jsonb END
    ) WITH ORDINALITY AS image(value, ordinality)
    WHERE p.source_payload->'images' IS NOT NULL
    ORDER BY p.source_product_id NULLS LAST, p.id, image.ordinality
  `)
  const mediaRows = result.rows.slice(0, limit)
  const existing = await pool.query('SELECT blob_pathname FROM store_product_assets')
  const existingPathnames = new Set(existing.rows.map((row) => row.blob_pathname))
  let nextIndex = 0

  async function worker() {
    while (nextIndex < mediaRows.length) {
      const row = mediaRows[nextIndex]
      nextIndex += 1
      const sourceUrl = safeSourceUrl(row.source_url)
      if (!sourceUrl) {
        failed += 1
        failures.push({ product: row.product_name, reason: 'Invalid or disallowed source URL.' })
        continue
      }
      try {
        const digest = createHash('sha256').update(sourceUrl.toString()).digest('hex')
        const pathnamePrefix = `products/${row.product_id}/catalog-${digest}`
        const existingPath = [...existingPathnames].find((pathname) => pathname.startsWith(`${pathnamePrefix}.`))
        if (existingPath) {
          skipped += 1
          await pool.query(
            `UPDATE store_products
             SET hero_image_url = COALESCE(hero_image_url, (
               SELECT blob_url FROM store_product_assets
               WHERE product_id = $1 AND blob_pathname = $2 AND media_type = 'image'
               LIMIT 1
             ))
             WHERE id = $1`,
            [row.product_id, existingPath],
          )
          continue
        }

        let downloaded
        let lastError
        for (let attempt = 1; attempt <= 3; attempt += 1) {
          try {
            downloaded = await fetchImage(sourceUrl)
            break
          } catch (error) {
            lastError = error
            if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 700))
          }
        }
        if (!downloaded) throw lastError ?? new Error('The source image could not be downloaded.')

        const blobPathname = `${pathnamePrefix}.${downloaded.extension}`
        const blob = await put(blobPathname, downloaded.bytes, {
          access: 'public',
          addRandomSuffix: false,
          contentType: downloaded.contentType,
          cacheControlMaxAge: 31_536_000,
        })
        const client = await pool.connect()
        try {
          await client.query('BEGIN')
          await client.query(
            `INSERT INTO store_product_assets
              (product_id, blob_pathname, blob_url, alt_text, media_type, sort_order)
             VALUES ($1, $2, $3, $4, 'image', $5)
             ON CONFLICT (product_id, blob_pathname) DO NOTHING`,
            [row.product_id, blob.pathname, blob.url, String(row.alt_text).slice(0, 500), row.sort_order],
          )
          await client.query(
            `UPDATE store_products SET hero_image_url = COALESCE(hero_image_url, $2), updated_at = now()
             WHERE id = $1`,
            [row.product_id, blob.url],
          )
          await client.query('COMMIT')
          existingPathnames.add(blob.pathname)
          uploaded += 1
        } catch (error) {
          await client.query('ROLLBACK')
          throw error
        } finally {
          client.release()
        }
      } catch (error) {
        failed += 1
        failures.push({
          product: row.product_name,
          reason: error instanceof Error ? error.message : 'Unknown transfer failure.',
        })
      }
      if ((uploaded + skipped + failed) % 25 === 0) {
        console.log(`Processed ${uploaded + skipped + failed}/${mediaRows.length} source images; copied ${uploaded}, already present ${skipped}, failed ${failed}.`)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, mediaRows.length) }, () => worker()))
  console.log(JSON.stringify({
    sourceImageReferences: result.rowCount,
    attempted: mediaRows.length,
    uploaded,
    alreadyPresent: skipped,
    failed,
    remaining: Math.max(0, result.rowCount - mediaRows.length),
    failures: failures.slice(0, 30),
  }, null, 2))
  if (failed) process.exitCode = 1
} finally {
  await pool.end()
}

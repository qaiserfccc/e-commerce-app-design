import pg from 'pg'
import { createHash } from 'node:crypto'
import { isManagedMediaUrl, mediaPathFromUrl, publicMediaUrl } from '../media-url.mjs'
import { normalizePostgresConnectionString } from '../db/postgres-connection.mjs'

const { Pool } = pg
let pool

function getPool() {
  const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED
  if (!connectionString) throw new Error('Database connection is not configured.')
  pool ??= new Pool({
    connectionString: normalizePostgresConnectionString(connectionString),
    max: 3,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  })
  return pool
}

function validPath(pathname) {
  if (typeof pathname !== 'string' || pathname.length > 1024 ||
      pathname.startsWith('/') || !/^[a-zA-Z0-9._/-]+$/.test(pathname) ||
      pathname.split('/').some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error('Media path is invalid.')
  }
  return pathname
}

export function assertMediaStorageConfigured() {
  if (!process.env.DATABASE_URL_UNPOOLED && !process.env.DATABASE_URL) {
    throw new Error('Database connection is not configured.')
  }
  publicMediaUrl('healthcheck')
}

export function mediaStorageConfigured() {
  try {
    assertMediaStorageConfigured()
    return true
  } catch {
    return false
  }
}

export function isOwnedMediaUrl(value) {
  return isManagedMediaUrl(value)
}

export function mediaPathFromOwnedUrl(value) {
  return mediaPathFromUrl(value)
}

export function getMediaPublicUrl(pathname) {
  return publicMediaUrl(validPath(pathname))
}

export async function uploadMedia(pathname, body, contentType) {
  const key = validPath(pathname)
  if (!(body instanceof Uint8Array) || body.byteLength === 0) throw new Error('Media upload is empty.')
  if (typeof contentType !== 'string' || !/^[\w.+-]+\/[\w.+-]+$/.test(contentType)) {
    throw new Error('Media content type is invalid.')
  }
  const pool = getPool()
  await pool.query(
    `INSERT INTO public.store_media_objects (pathname, content_type, byte_length, digest, content)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (pathname) DO UPDATE SET
       content_type = EXCLUDED.content_type,
       byte_length = EXCLUDED.byte_length,
       digest = EXCLUDED.digest,
       content = EXCLUDED.content,
       updated_at = now()`,
    [key, contentType, body.byteLength, createHash('sha256').update(body).digest(), Buffer.from(body)],
  )
  return { pathname: key, url: getMediaPublicUrl(key) }
}

export async function deleteMedia(pathname) {
  await getPool().query('DELETE FROM public.store_media_objects WHERE pathname = $1', [validPath(pathname)])
}

export async function mediaObjectExists(pathname) {
  const result = await getPool().query(
    'SELECT 1 FROM public.store_media_objects WHERE pathname = $1',
    [validPath(pathname)],
  )
  return result.rowCount > 0
}

export async function readMedia(pathname) {
  const result = await getPool().query(
    `SELECT content_type, byte_length, content, encode(digest, 'hex') AS etag
     FROM public.store_media_objects WHERE pathname = $1`,
    [validPath(pathname)],
  )
  return result.rows[0] ?? null
}

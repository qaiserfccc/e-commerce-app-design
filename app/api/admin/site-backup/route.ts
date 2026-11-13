import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import type { PoolClient } from 'pg'
import { requireAdminSession } from '@/lib/auth/admin'
import { pool } from '@/lib/db'
import { adminApiFailure } from '@/lib/http/admin-route'
import { assertAdminOrigin, readAdminJson } from '@/lib/http/admin-route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const FORMAT_VERSION = 1
const SCHEMA_VERSION = 29
const JOB_LIFETIME_HOURS = 12
const JSON_CHUNK_LIMIT = 2 * 1024 * 1024
const MEDIA_CHUNK_LIMIT = 512 * 1024
const TABLES = [
  'store_categories',
  'store_brands',
  'store_lens_shades',
  'store_lens_types',
  'store_products',
  'store_product_viewers',
  'store_product_categories',
  'store_product_reviews',
  'store_product_relations',
  'store_customers',
  'store_orders',
  'store_order_items',
  'store_product_assets',
  'store_product_variants',
  'store_activity_events',
  'store_growth_events',
  'store_error_logs',
  'store_banners',
  'store_media_objects',
  'store_reviews',
  'store_settings',
  'store_crm_leads',
] as const
type BackupTable = (typeof TABLES)[number]
type ManifestEntry = { name: BackupTable; rowCount: number }

const TABLE_SET = new Set<string>(TABLES)
const RESTORE_ORDER: BackupTable[] = [
  'store_categories',
  'store_brands',
  'store_lens_shades',
  'store_lens_types',
  'store_customers',
  'store_products',
  'store_product_viewers',
  'store_product_categories',
  'store_product_reviews',
  'store_product_relations',
  'store_orders',
  'store_order_items',
  'store_product_assets',
  'store_product_variants',
  'store_activity_events',
  'store_growth_events',
  'store_error_logs',
  'store_banners',
  'store_media_objects',
  'store_reviews',
  'store_settings',
  'store_crm_leads',
]

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function validManifest(value: unknown): ManifestEntry[] | null {
  if (!Array.isArray(value) || value.length !== TABLES.length) return null
  const names = new Set<string>()
  const manifest: ManifestEntry[] = []
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.name !== 'string' || !TABLE_SET.has(entry.name)) return null
    if (!Number.isSafeInteger(entry.rowCount) || (entry.rowCount as number) < 0 || (entry.rowCount as number) > 1_000_000) return null
    if (names.has(entry.name)) return null
    names.add(entry.name)
    manifest.push({ name: entry.name as BackupTable, rowCount: entry.rowCount as number })
  }
  if (names.size !== TABLES.length || TABLES.some((table) => !names.has(table))) return null
  if (manifest.reduce((sum, item) => sum + item.rowCount, 0) > 2_000_000) return null
  return manifest
}

function getIdentifier(value: string) {
  if (!TABLE_SET.has(value)) throw new Error('Unsupported backup table.')
  return `"${value}"`
}

async function assertStagingTables(client: PoolClient) {
  const result = await client.query(`
    SELECT to_regclass('public.store_site_backup_rows') AS rows_table,
      to_regclass('public.store_site_backup_jobs') AS jobs_table
  `)
  if (!result.rows[0]?.rows_table || !result.rows[0]?.jobs_table) {
    throw new Error('Run database migration 0029_site_backup_transfer.sql before using site backup.')
  }
}

async function assertJob(client: PoolClient | typeof pool, jobId: string, userId: string, operation: 'export' | 'restore') {
  const result = await client.query({
    text: `
      SELECT id, operation, manifest
      FROM public.store_site_backup_jobs
      WHERE id = $1 AND user_id = $2 AND operation = $3 AND expires_at > now()
    `,
    values: [jobId, userId, operation],
  }) as { rows: Array<{ id: string; operation: string; manifest: ManifestEntry[] }> }
  return result.rows[0] ?? null
}

async function beginExport(userId: string) {
  const client = await pool.connect()
  let locked = false
  try {
    await client.query('SELECT pg_advisory_lock(hashtextextended($1, 0))', [userId])
    locked = true
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ')
    await assertStagingTables(client)
    await client.query('DELETE FROM public.store_site_backup_jobs WHERE expires_at <= now()')
    const active = await client.query(
      'SELECT 1 FROM public.store_site_backup_jobs WHERE user_id = $1 AND expires_at > now() LIMIT 1',
      [userId],
    )
    if (active.rowCount) throw new Error('Finish or cancel your existing backup/restore before starting another.')

    const available = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
      [TABLES],
    )
    const availableTables = new Set(available.rows.map((row: { table_name: string }) => row.table_name))
    const missing = TABLES.filter((table) => !availableTables.has(table))
    if (missing.length) throw new Error(`The database schema is incomplete. Missing tables: ${missing.join(', ')}.`)

    const jobId = randomUUID()
    await client.query(
      `INSERT INTO public.store_site_backup_jobs (id, user_id, operation, manifest, expires_at)
       VALUES ($1, $2, 'export', '[]'::jsonb, now() + interval '${JOB_LIFETIME_HOURS} hours')`,
      [jobId, userId],
    )

    const manifest: ManifestEntry[] = []
    for (const table of TABLES) {
      const identifier = getIdentifier(table)
      const mediaContent = table === 'store_media_objects' ? 'source.content' : 'NULL::bytea'
      const rowData = table === 'store_media_objects' ? "to_jsonb(source) - 'content'" : 'to_jsonb(source)'
      const result = await client.query(
        `INSERT INTO public.store_site_backup_rows (job_id, table_name, row_index, row_data, media_content)
         SELECT $1, $2, row_number() OVER () - 1, ${rowData}, ${mediaContent}
         FROM public.${identifier} AS source`,
        [jobId, table],
      )
      manifest.push({ name: table, rowCount: result.rowCount ?? 0 })
    }
    await client.query(
      'UPDATE public.store_site_backup_jobs SET manifest = $2::jsonb WHERE id = $1',
      [jobId, JSON.stringify(manifest)],
    )
    await client.query('COMMIT')
    return { jobId, manifest, formatVersion: FORMAT_VERSION, schemaVersion: SCHEMA_VERSION }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    try {
      if (locked) await client.query('SELECT pg_advisory_unlock(hashtextextended($1, 0))', [userId])
    } finally {
      client.release()
    }
  }
}

async function beginRestore(userId: string, manifest: ManifestEntry[]) {
  const client = await pool.connect()
  let locked = false
  try {
    await client.query('SELECT pg_advisory_lock(hashtextextended($1, 0))', [userId])
    locked = true
    await client.query('BEGIN')
    await assertStagingTables(client)
    await client.query('DELETE FROM public.store_site_backup_jobs WHERE expires_at <= now()')
    const active = await client.query(
      'SELECT 1 FROM public.store_site_backup_jobs WHERE user_id = $1 AND expires_at > now() LIMIT 1',
      [userId],
    )
    if (active.rowCount) throw new Error('Finish or cancel your existing backup/restore before starting another.')

    const id = randomUUID()
    await client.query(
      `INSERT INTO public.store_site_backup_jobs (id, user_id, operation, manifest, expires_at)
       VALUES ($1, $2, 'restore', $3::jsonb, now() + interval '${JOB_LIFETIME_HOURS} hours')`,
      [id, userId, JSON.stringify(manifest)],
    )
    await client.query('COMMIT')
    return { jobId: id }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    try {
      if (locked) await client.query('SELECT pg_advisory_unlock(hashtextextended($1, 0))', [userId])
    } finally {
      client.release()
    }
  }
}

async function completeRestore(jobId: string, userId: string) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const jobResult = await client.query(
      `SELECT manifest FROM public.store_site_backup_jobs
       WHERE id = $1 AND user_id = $2 AND operation = 'restore' AND expires_at > now()
       FOR UPDATE`,
      [jobId, userId],
    )
    const manifest = validManifest(jobResult.rows[0]?.manifest)
    if (!manifest) throw new Error('The restore upload is missing, expired, or has an invalid manifest.')

    for (const entry of manifest) {
      const result = await client.query(
        `SELECT count(*)::int AS row_count, min(row_index)::bigint AS first_index,
           max(row_index)::bigint AS last_index,
           count(*) FILTER (
             WHERE table_name = 'store_media_objects'
               AND (media_content IS NULL OR octet_length(media_content) <> (row_data ->> 'byte_length')::integer)
           )::int AS missing_media
         FROM public.store_site_backup_rows
         WHERE job_id = $1 AND table_name = $2`,
        [jobId, entry.name],
      )
      const row = result.rows[0]
      const count = Number(row.row_count)
      if (count !== entry.rowCount ||
        (count > 0 && (Number(row.first_index) !== 0 || Number(row.last_index) !== count - 1)) ||
        Number(row.missing_media) !== 0) {
        throw new Error(`The uploaded ${entry.name} data is incomplete. Upload the backup file again.`)
      }
    }

    const names = RESTORE_ORDER.map(getIdentifier).join(', ')
    await client.query(`TRUNCATE TABLE ${names} RESTART IDENTITY`)

    for (const table of RESTORE_ORDER) {
      const identifier = getIdentifier(table)
      const rowData = table === 'store_categories'
        ? `jsonb_set(rows.row_data, '{parent_id}', 'null'::jsonb, true)`
        : table === 'store_media_objects'
          ? `rows.row_data || jsonb_build_object('content', '\\x' || encode(rows.media_content, 'hex'))`
          : 'rows.row_data'
      await client.query(
        `INSERT INTO public.${identifier} OVERRIDING SYSTEM VALUE
         SELECT (jsonb_populate_record(NULL::public.${identifier}, ${rowData})).*
         FROM public.store_site_backup_rows AS rows
         WHERE rows.job_id = $1 AND rows.table_name = $2
         ORDER BY rows.row_index`,
        [jobId, table],
      )
    }

    await client.query(
      `UPDATE public.store_categories AS target
       SET parent_id = (rows.row_data ->> 'parent_id')::uuid
       FROM public.store_site_backup_rows AS rows
       WHERE rows.job_id = $1 AND rows.table_name = 'store_categories'
         AND rows.row_data ->> 'parent_id' IS NOT NULL AND rows.row_data ->> 'parent_id' <> 'null'
         AND target.id = (rows.row_data ->> 'id')::uuid`,
      [jobId],
    )

    const identities = await client.query(
      `SELECT table_name, column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = ANY($1::text[]) AND is_identity = 'YES'`,
      [TABLES],
    )
    for (const identity of identities.rows as Array<{ table_name: BackupTable; column_name: string }>) {
      const table = getIdentifier(identity.table_name)
      const column = `"${identity.column_name.replaceAll('"', '""')}"`
      await client.query(
        `SELECT setval(pg_get_serial_sequence($1, $2), COALESCE(MAX(${column}), 1), MAX(${column}) IS NOT NULL)
         FROM public.${table}`,
        [`public.${identity.table_name}`, identity.column_name],
      )
    }

    const counts = Object.fromEntries(manifest.map((item) => [item.name, item.rowCount]))
    await client.query('DELETE FROM public.store_site_backup_jobs WHERE id = $1', [jobId])
    await client.query('COMMIT')
    return counts
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function GET(request: Request) {
  try {
    const session = await requireAdminSession('owner')
    const url = new URL(request.url)
    const action = url.searchParams.get('action')
    const jobId = url.searchParams.get('jobId')
    if (action === 'status') {
      const result = await pool.query(`
        SELECT to_regclass('public.store_site_backup_jobs') IS NOT NULL AS jobs_ready,
          to_regclass('public.store_site_backup_rows') IS NOT NULL AS rows_ready
      `)
      const ready = Boolean(result.rows[0]?.jobs_ready && result.rows[0]?.rows_ready)
      return json({
        data: {
          ready,
          requiredMigration: ready ? null : '0029_site_backup_transfer.sql',
          formatVersion: FORMAT_VERSION,
          schemaVersion: SCHEMA_VERSION,
          tables: TABLES.length,
          mediaChunkBytes: MEDIA_CHUNK_LIMIT,
        },
      })
    }
    if (!isUuid(jobId)) return json({ error: 'A valid backup job is required.' }, 400)

    if (action === 'export-page') {
      const table = url.searchParams.get('table') ?? ''
      const offset = Number(url.searchParams.get('offset') ?? '0')
      if (!TABLE_SET.has(table) || !Number.isSafeInteger(offset) || offset < 0) {
        return json({ error: 'The backup page request is invalid.' }, 400)
      }
      const job = await assertJob(pool, jobId, session.userId, 'export') as { manifest: ManifestEntry[] } | null
      if (!job) return json({ error: 'The backup session expired. Start a new backup.' }, 404)
      const entry = job.manifest.find((item) => item.name === table)
      if (!entry || offset > entry.rowCount) return json({ error: 'The backup page is out of range.' }, 400)
      const result = await pool.query(
        `SELECT row_index::integer AS row_index, row_data FROM public.store_site_backup_rows
         WHERE job_id = $1 AND table_name = $2
         ORDER BY row_index LIMIT 25 OFFSET $3`,
        [jobId, table, offset],
      )
      return json({ data: { rows: result.rows, nextOffset: offset + result.rows.length, total: entry.rowCount } })
    }

    if (action === 'export-media') {
      const pathname = url.searchParams.get('pathname')
      const offset = Number(url.searchParams.get('offset') ?? '0')
      if (typeof pathname !== 'string' || pathname.length > 1024 ||
        !Number.isSafeInteger(offset) || offset < 0) {
        return json({ error: 'The media download request is invalid.' }, 400)
      }
      const job = await assertJob(pool, jobId, session.userId, 'export')
      if (!job) return json({ error: 'The backup session expired. Start a new backup.' }, 404)
      const result = await pool.query(
        `SELECT substring(media_content FROM $3 + 1 FOR $4) AS content
         FROM public.store_site_backup_rows
         WHERE job_id = $1 AND table_name = 'store_media_objects' AND row_data ->> 'pathname' = $2`,
        [jobId, pathname, offset, MEDIA_CHUNK_LIMIT],
      )
      if (!result.rows[0]) return json({ error: 'The media object is not in this backup.' }, 404)
      return new Response(result.rows[0].content as Buffer, {
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/octet-stream',
          'X-Content-Length': String((result.rows[0].content as Buffer).byteLength),
        },
      })
    }

    return json({ error: 'Choose a supported backup read action.' }, 400)
  } catch (error) {
    return adminApiFailure(error)
  }
}

export async function POST(request: Request) {
  try {
    assertAdminOrigin(request)
    const session = await requireAdminSession('owner')
    const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase()

    if (contentType === 'application/octet-stream') {
      const jobId = request.headers.get('x-backup-job-id')
      const encodedPathname = request.headers.get('x-backup-pathname')
      const offset = Number(request.headers.get('x-backup-offset') ?? '-1')
      if (!isUuid(jobId) || !encodedPathname || encodedPathname.length > 3072 ||
        !Number.isSafeInteger(offset) || offset < 0) {
        return json({ error: 'The media upload request is invalid.' }, 400)
      }
      let pathname: string
      try {
        pathname = decodeURIComponent(encodedPathname)
      } catch {
        return json({ error: 'The media pathname is invalid.' }, 400)
      }
      if (pathname.length > 1024) return json({ error: 'The media pathname is too long.' }, 400)
      const contentLength = request.headers.get('content-length')
      if (contentLength !== null && (!/^\d+$/.test(contentLength) || Number(contentLength) > MEDIA_CHUNK_LIMIT)) {
        return json({ error: 'Media must be uploaded in chunks of 512 KB or less.' }, 413)
      }
      const job = await assertJob(pool, jobId, session.userId, 'restore')
      if (!job) return json({ error: 'The restore session expired. Upload the backup again.' }, 404)
      const bytes = Buffer.from(await request.arrayBuffer())
      if (!bytes.length || bytes.length > MEDIA_CHUNK_LIMIT) {
        return json({ error: 'Media must be uploaded in chunks of 512 KB or less.' }, 413)
      }
      const result = await pool.query(
        `UPDATE public.store_site_backup_rows
         SET media_content = CASE
           WHEN octet_length(COALESCE(media_content, '\\x'::bytea)) = $3
             THEN COALESCE(media_content, '\\x'::bytea) || $4::bytea
           ELSE media_content
         END
         WHERE job_id = $1 AND table_name = 'store_media_objects'
           AND row_data ->> 'pathname' = $2
           AND $3 + octet_length($4::bytea) <= (row_data ->> 'byte_length')::integer
           AND (
             octet_length(COALESCE(media_content, '\\x'::bytea)) = $3 OR
             (
               octet_length(COALESCE(media_content, '\\x'::bytea)) >= $3 + octet_length($4::bytea)
               AND substring(media_content FROM $3 + 1 FOR octet_length($4::bytea)) = $4::bytea
             )
           )`,
        [jobId, pathname, offset, bytes],
      )
      if (!result.rowCount) return json({ error: 'Media upload is out of order or does not match the backup.' }, 409)
      return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
    }

    const body = await readAdminJson(request, JSON_CHUNK_LIMIT + 16 * 1024)
    if (body.action === 'start-export') {
      if (Object.keys(body).length !== 1) return json({ error: 'The backup request contains unsupported fields.' }, 400)
      return json({ data: await beginExport(session.userId) }, 201)
    }

    if (body.action === 'begin-restore') {
      if (Object.keys(body).some((key) => !['action', 'formatVersion', 'schemaVersion', 'manifest', 'confirmation'].includes(key))) {
        return json({ error: 'The restore request contains unsupported fields.' }, 400)
      }
      if (body.formatVersion !== FORMAT_VERSION || body.schemaVersion !== SCHEMA_VERSION) {
        return json({ error: `This backup file is not compatible. Expected format ${FORMAT_VERSION} and schema ${SCHEMA_VERSION}.` }, 400)
      }
      if (body.confirmation !== 'RESTORE ALL STORE DATA') {
        return json({ error: 'Type RESTORE ALL STORE DATA to confirm.' }, 400)
      }
      const manifest = validManifest(body.manifest)
      if (!manifest) return json({ error: 'The backup manifest is incomplete or invalid.' }, 400)
      return json({ data: await beginRestore(session.userId, manifest) }, 201)
    }

    if (body.action === 'upload-rows') {
      if (Object.keys(body).some((key) => !['action', 'jobId', 'table', 'startIndex', 'rows'].includes(key))) {
        return json({ error: 'The upload request contains unsupported fields.' }, 400)
      }
      const { jobId, table, startIndex, rows } = body
      if (!isUuid(jobId) || typeof table !== 'string' || !TABLE_SET.has(table) ||
        !Number.isSafeInteger(startIndex) || (startIndex as number) < 0 ||
        !Array.isArray(rows) || rows.length < 1 || rows.length > 250 ||
        !rows.every(isRecord)) {
        return json({ error: 'The backup data chunk is invalid.' }, 400)
      }
      const job = await assertJob(pool, jobId, session.userId, 'restore')
      if (!job) return json({ error: 'The restore session expired. Upload the backup again.' }, 404)
      const entry = job.manifest.find((item) => item.name === table)
      if (!entry || (startIndex as number) + rows.length > entry.rowCount) {
        return json({ error: 'The backup data chunk is outside the manifest.' }, 400)
      }
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        for (let index = 0; index < rows.length; index += 1) {
          const row = rows[index]
          let mediaContent: Buffer | null = null
          if (table === 'store_media_objects') {
            if (Object.hasOwn(row, 'content') || !Number.isSafeInteger(row.byte_length) || (row.byte_length as number) < 0) {
              throw new Error('A media object has invalid backup metadata.')
            }
            mediaContent = Buffer.alloc(0)
          } else if (Object.hasOwn(row, 'content')) {
            throw new Error('The backup contains unexpected binary content.')
          }
          await client.query(
            `INSERT INTO public.store_site_backup_rows AS existing (job_id, table_name, row_index, row_data, media_content)
             VALUES ($1, $2, $3, $4::jsonb, $5)
             ON CONFLICT (job_id, table_name, row_index)
             DO UPDATE SET row_data = EXCLUDED.row_data,
               media_content = CASE
                   WHEN existing.row_data = EXCLUDED.row_data
                     THEN existing.media_content
                 ELSE EXCLUDED.media_content
               END`,
            [jobId, table, (startIndex as number) + index, JSON.stringify(row), mediaContent],
          )
        }
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
      return json({ data: { uploaded: rows.length, nextIndex: (startIndex as number) + rows.length } })
    }

    if (body.action === 'upload-media') {
      return json({ error: 'Upload media as application/octet-stream chunks.' }, 415)
    }

    if (body.action === 'complete-restore') {
      if (Object.keys(body).some((key) => !['action', 'jobId', 'confirmation'].includes(key))) {
        return json({ error: 'The restore request contains unsupported fields.' }, 400)
      }
      if (!isUuid(body.jobId) || body.confirmation !== 'RESTORE ALL STORE DATA') {
        return json({ error: 'Confirm the complete store restore.' }, 400)
      }
      const counts = await completeRestore(body.jobId, session.userId)
      return json({ data: { restored: true, tables: counts } })
    }

    if (body.action === 'cancel') {
      if (Object.keys(body).some((key) => !['action', 'jobId'].includes(key)) || !isUuid(body.jobId)) {
        return json({ error: 'The backup session is invalid.' }, 400)
      }
      await pool.query(
        'DELETE FROM public.store_site_backup_jobs WHERE id = $1 AND user_id = $2',
        [body.jobId, session.userId],
      )
      return json({ data: { cancelled: true } })
    }

    return json({ error: 'Choose a supported backup action.' }, 400)
  } catch (error) {
    return adminApiFailure(error)
  }
}

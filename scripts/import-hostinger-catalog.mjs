// Set DATABASE_URL and DATABASE_URL_UNPOOLED to the local copy before running.
import pg from 'pg'
import { normalizePostgresConnectionString } from '../lib/db/postgres-connection.mjs'

const { Pool } = pg
const databaseUrls = [
  process.env.DATABASE_URL_UNPOOLED,
  process.env.DATABASE_URL,
].filter(Boolean)

if (!databaseUrls.length) throw new Error('Database connection is not configured.')

function assertLocalCopy(connectionString) {
  let url
  try {
    url = new URL(connectionString)
  } catch {
    throw new Error('The Hostinger catalog import requires a local database URL.')
  }
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      url.pathname !== '/isklenses_production_copy') {
    throw new Error('The Hostinger catalog import is restricted to the local isklenses_production_copy database.')
  }
}

for (const connectionString of databaseUrls) assertLocalCopy(connectionString)

const pool = new Pool({
  connectionString: normalizePostgresConnectionString(databaseUrls[0]),
  max: 1,
  connectionTimeoutMillis: 10_000,
})

try {
  const result = await pool.query('select current_database() as database_name')
  if (result.rows[0]?.database_name !== 'isklenses_production_copy') {
    throw new Error('Connected database is not the local isklenses_production_copy database.')
  }
} finally {
  await pool.end()
}

process.env.ISK_CATALOG_SOURCE = 'hostingerMirror'
const { syncIskCatalog } = await import('../lib/server/isk-catalog-sync.mjs')
const result = await syncIskCatalog('products')
console.log(JSON.stringify(result, null, 2))
if (result.results.some((item) => Number(item.failed ?? 0) > 0)) process.exitCode = 1

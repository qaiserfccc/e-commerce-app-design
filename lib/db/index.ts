import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { normalizePostgresConnectionString } from './postgres-connection.mjs'
import * as schema from './schema'

const globalForDb = globalThis as unknown as { pool?: Pool }

const connectionString = process.env.DATABASE_URL
  ? normalizePostgresConnectionString(process.env.DATABASE_URL)
  : undefined

export const pool = globalForDb.pool ?? new Pool({ connectionString })

if (process.env.NODE_ENV !== 'production') globalForDb.pool = pool

export const db = drizzle(pool, { schema })

import 'server-only'

import { randomBytes } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

const SECRET_NAME = 'auth_signing_secret'
let cached: string | null = null

// The signing secret lives in the database (store_secrets); no environment variable is needed.
export async function loadAuthSecret() {
  if (cached) return cached
  const generated = randomBytes(48).toString('hex')
  await db.execute(sql`INSERT INTO store_secrets (name, value) VALUES (${SECRET_NAME}, ${generated}) ON CONFLICT (name) DO NOTHING`)
  const result = await db.execute(sql`SELECT value FROM store_secrets WHERE name = ${SECRET_NAME}`)
  const rows = (Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows ?? []) as { value?: string }[]
  const value = rows[0]?.value
  if (!value || value.length < 32) throw new Error('Auth signing secret is unavailable.')
  cached = value
  return value
}

export function peekAuthSecret() {
  if (!cached) throw new Error('Auth signing secret has not been loaded.')
  return cached
}

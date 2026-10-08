import 'server-only'

import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { cookies } from 'next/headers'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { appUsers, type UserRole } from '@/lib/db/schema'

const scryptAsync = promisify(scrypt)
const COOKIE_NAME = 'morrow-role-session'
const SESSION_SECONDS = 8 * 60 * 60

export type RoleSession = { id: string; email: string; name: string; role: UserRole; expiresAt: number }

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET
  if (!value || value.length < 32) throw new Error('Role authentication is not configured.')
  return value
}

function sign(payload: string) { return createHmac('sha256', secret()).update(payload).digest('base64url') }

async function verifyPassword(password: string, encoded: string) {
  const [, salt, expected] = encoded.split('$')
  if (!salt || !expected) return false
  const actual = (await scryptAsync(password, salt, 64)) as Buffer
  const expectedBuffer = Buffer.from(expected, 'hex')
  return expectedBuffer.length === actual.length && timingSafeEqual(actual, expectedBuffer)
}

export async function authenticateRole(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const [user] = await db.select().from(appUsers).where(eq(appUsers.email, normalizedEmail)).limit(1)
  if (!user || !(await verifyPassword(password, user.passwordHash))) return null
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS
  const payload = Buffer.from(JSON.stringify({ id: user.id, email: user.email, name: user.name, role: user.role, expiresAt })).toString('base64url')
  ;(await cookies()).set(COOKIE_NAME, `${payload}.${sign(payload)}`, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: SESSION_SECONDS })
  return { id: user.id, email: user.email, name: user.name, role: user.role, expiresAt }
}

export async function getRoleSession(): Promise<RoleSession | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value
  if (!token) return null
  const separator = token.lastIndexOf('.')
  if (separator <= 0) return null
  const payload = token.slice(0, separator)
  if (!timingSafeEqual(Buffer.from(token.slice(separator + 1)), Buffer.from(sign(payload)))) return null
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as RoleSession
    return session.expiresAt > Math.floor(Date.now() / 1000) ? session : null
  } catch { return null }
}

export async function clearRoleSession() { (await cookies()).delete(COOKIE_NAME) }

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  return new Promise<string>((resolve, reject) => scrypt(password, salt, 64, (error, derived) => error ? reject(error) : resolve(`scrypt$${salt}$${derived.toString('hex')}`)))
}

export const roleLabels: Record<UserRole, string> = { admin: 'Administrator', manager: 'Manager', customer: 'Customer', guest: 'Guest' }

export { SESSION_SECONDS }

export async function requireRole(roles: UserRole[]) {
  const session = await getRoleSession()
  if (!session || !roles.includes(session.role)) throw new Error('Unauthorized')
  return session
}

export type { UserRole }

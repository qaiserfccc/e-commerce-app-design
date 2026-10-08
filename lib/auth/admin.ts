import 'server-only'

import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { storeAdminUsers } from '@/lib/db/schema'

const COOKIE_NAME = 'morrow-admin-session'
const SESSION_DURATION_SECONDS = 8 * 60 * 60
const PASSWORD_HASH_SCHEME = 'scrypt'

type AdminSession = {
  userId: string
  email: string
  expiresAt: number
  sessionVersion: number
}

type AdminUser = typeof storeAdminUsers.$inferSelect
type AdminRole = 'owner' | 'admin' | 'staff'
type AuthenticatedSession = { userId: string; email: string; role: AdminRole; expiresAt: number }

export class AdminAuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403 | 503,
  ) {
    super(message)
    this.name = 'AdminAuthError'
  }
}

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) return null
  if (secret.length < 32) throw new AdminAuthError('Admin session signing is not configured correctly.', 503)
  return secret
}

function constantTimeEqual(left: string, right: string) {
  const leftHash = createHash('sha256').update(left).digest()
  const rightHash = createHash('sha256').update(right).digest()
  return timingSafeEqual(leftHash, rightHash)
}

function sign(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function parseSession(token: string, secret: string): AdminSession | null {
  if (token.length > 2048) return null
  const separator = token.lastIndexOf('.')
  if (separator <= 0) return null

  const payload = token.slice(0, separator)
  const signature = token.slice(separator + 1)
  if (!constantTimeEqual(signature, sign(payload, secret))) return null

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<AdminSession>
    if (
      typeof session.userId !== 'string' ||
      typeof session.email !== 'string' ||
      typeof session.expiresAt !== 'number' ||
      typeof session.sessionVersion !== 'number' ||
      session.expiresAt <= Math.floor(Date.now() / 1000)
    ) return null

    return {
      userId: session.userId,
      email: session.email,
      expiresAt: session.expiresAt,
      sessionVersion: session.sessionVersion,
    }
  } catch {
    return null
  }
}

export function isAdminAuthConfigured() {
  return getSessionSecret() !== null
}

function deriveKey(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error)
      else resolve(key as Buffer)
    })
  })
}

export async function hashAdminPassword(password: string) {
  if (password.length < 16 || password.length > 256) {
    throw new Error('Password must be between 16 and 256 characters.')
  }
  const salt = randomBytes(16)
  const derivedKey = await deriveKey(password, salt)
  return `${PASSWORD_HASH_SCHEME}$16384$8$1$${salt.toString('base64url')}$${derivedKey.toString('base64url')}`
}

async function verifyPassword(password: string, passwordHash: string) {
  const [scheme, n, r, p, encodedSalt, encodedKey] = passwordHash.split('$')
  if (scheme !== PASSWORD_HASH_SCHEME || n !== '16384' || r !== '8' || p !== '1' || !encodedSalt || !encodedKey) {
    return false
  }
  const salt = Buffer.from(encodedSalt, 'base64url')
  const expected = Buffer.from(encodedKey, 'base64url')
  if (salt.length !== 16 || expected.length !== 64) return false
  const actual = await deriveKey(password, salt)
  return timingSafeEqual(actual, expected)
}

export async function verifyAdminCredentials(email: string, password: string): Promise<AdminUser | null> {
  if (typeof email !== 'string' || typeof password !== 'string' || password.length > 256) return null
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail || normalizedEmail.length > 254) return null
  const [user] = await db.select().from(storeAdminUsers).where(eq(storeAdminUsers.email, normalizedEmail)).limit(1)
  if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) return null
  return user
}

export async function createAdminSession(user: AdminUser) {
  const secret = getSessionSecret()
  if (!secret) throw new AdminAuthError('Admin session signing is not configured.', 503)

  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS
  const payload = Buffer.from(JSON.stringify({
    userId: user.id,
    email: user.email,
    expiresAt,
    sessionVersion: user.sessionVersion,
  })).toString('base64url')
  const token = `${payload}.${sign(payload, secret)}`

  ;(await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  })
  await db.update(storeAdminUsers).set({ lastLoginAt: new Date() }).where(eq(storeAdminUsers.id, user.id))
  return expiresAt
}

export async function clearAdminSession() {
  ;(await cookies()).delete(COOKIE_NAME)
}

export async function getAdminSession(): Promise<AuthenticatedSession | null> {
  const secret = getSessionSecret()
  if (!secret) return null
  const token = (await cookies()).get(COOKIE_NAME)?.value
  if (!token) return null
  const session = parseSession(token, secret)
  if (!session) return null
  const [user] = await db.select().from(storeAdminUsers).where(eq(storeAdminUsers.id, session.userId)).limit(1)
  if (
    !user ||
    !user.isActive ||
    user.sessionVersion !== session.sessionVersion ||
    !constantTimeEqual(user.email, session.email)
  ) return null
  if (user.role !== 'owner' && user.role !== 'admin' && user.role !== 'staff') return null
  return { userId: user.id, email: user.email, role: user.role as AdminRole, expiresAt: session.expiresAt }
}

const roleLevel: Record<AdminRole, number> = { staff: 1, admin: 2, owner: 3 }

export async function requireAdminSession(minimumRole: AdminRole = 'staff') {
  if (!getSessionSecret()) throw new AdminAuthError('Admin session signing is not configured.', 503)
  const session = await getAdminSession()
  if (!session) throw new AdminAuthError('Sign in to access the admin workspace.', 401)
  if (roleLevel[session.role] < roleLevel[minimumRole]) {
    throw new AdminAuthError('You do not have permission to manage system users.', 403)
  }
  return session
}

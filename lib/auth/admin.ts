import 'server-only'

import { createHmac, createHash, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'morrow-admin-session'
const SESSION_DURATION_SECONDS = 8 * 60 * 60

type AdminSession = {
  email: string
  expiresAt: number
  credentialVersion: string
}

export class AdminAuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 503,
  ) {
    super(message)
    this.name = 'AdminAuthError'
  }
}

function getCredentials() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  const secret = process.env.ADMIN_SESSION_SECRET

  if (!email && !password && !secret) return null
  if (!email || !password || !secret || password.length < 16 || secret.length < 32) {
    throw new AdminAuthError('Admin authentication is not configured correctly.', 503)
  }

  return { email, password, secret }
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
      typeof session.email !== 'string' ||
      typeof session.expiresAt !== 'number' ||
      typeof session.credentialVersion !== 'string' ||
      session.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null
    }

    return { email: session.email, expiresAt: session.expiresAt, credentialVersion: session.credentialVersion }
  } catch {
    return null
  }
}

export function isAdminAuthConfigured() {
  return getCredentials() !== null
}

export function verifyAdminCredentials(email: string, password: string) {
  const credentials = getCredentials()
  if (!credentials) return false

  return (
    constantTimeEqual(email.trim().toLowerCase(), credentials.email) &&
    constantTimeEqual(password, credentials.password)
  )
}

export async function createAdminSession(email: string) {
  const credentials = getCredentials()
  if (!credentials) throw new AdminAuthError('Admin authentication is not configured.', 503)

  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS
  const credentialVersion = createHash('sha256').update(credentials.password).digest('hex')
  const payload = Buffer.from(JSON.stringify({ email: email.trim().toLowerCase(), expiresAt, credentialVersion })).toString('base64url')
  const token = `${payload}.${sign(payload, credentials.secret)}`

  ;(await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  })
  return expiresAt
}

export async function clearAdminSession() {
  ;(await cookies()).delete(COOKIE_NAME)
}

export async function getAdminSession() {
  const credentials = getCredentials()
  if (!credentials) return null
  const token = (await cookies()).get(COOKIE_NAME)?.value
  if (!token) return null
  const session = parseSession(token, credentials.secret)
  const credentialVersion = createHash('sha256').update(credentials.password).digest('hex')
  return session?.email === credentials.email && constantTimeEqual(session.credentialVersion, credentialVersion) ? session : null
}

export async function requireAdminSession() {
  if (!getCredentials()) {
    throw new AdminAuthError('Admin authentication is not configured.', 503)
  }

  const session = await getAdminSession()
  if (!session) throw new AdminAuthError('Sign in to access the admin workspace.', 401)
  return session
}

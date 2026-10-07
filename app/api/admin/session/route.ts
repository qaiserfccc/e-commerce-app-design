import { NextRequest, NextResponse } from 'next/server'
import {
  AdminAuthError,
  clearAdminSession,
  createAdminSession,
  getAdminSession,
  isAdminAuthConfigured,
  verifyAdminCredentials,
} from '@/lib/auth/admin'

export const dynamic = 'force-dynamic'

const failedAttempts = new Map<string, { count: number; resetAt: number }>()
const attemptWindowMs = 15 * 60 * 1000
const maximumAttempts = 5

function clientAddress(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',').at(-1)?.trim() || request.headers.get('x-real-ip') || 'unknown'
}

function isRateLimited(address: string) {
  const entry = failedAttempts.get(address)
  if (!entry || entry.resetAt <= Date.now()) {
    failedAttempts.delete(address)
    return false
  }
  return entry.count >= maximumAttempts
}

function recordFailedAttempt(address: string) {
  const now = Date.now()
  const entry = failedAttempts.get(address)
  if (!entry || entry.resetAt <= now) {
    failedAttempts.set(address, { count: 1, resetAt: now + attemptWindowMs })
  } else {
    entry.count += 1
  }
  if (failedAttempts.size > 1000) {
    for (const [key, value] of failedAttempts) {
      if (value.resetAt <= now) failedAttempts.delete(key)
    }
  }
}

function authError(error: unknown) {
  if (error instanceof AdminAuthError) {
    return NextResponse.json(
      { authenticated: false, configured: error.status !== 503, error: error.message },
      { status: error.status, headers: { 'Cache-Control': 'no-store' } },
    )
  }
  console.error('[admin-session] Request failed')
  return NextResponse.json({ error: 'Unable to complete the sign-in request.' }, { status: 500 })
}

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')
  return origin === request.nextUrl.origin && request.headers.get('sec-fetch-site') !== 'cross-site'
}

export async function GET() {
  try {
    if (!isAdminAuthConfigured()) {
      return NextResponse.json(
        { authenticated: false, configured: false, error: 'Admin access needs to be configured.' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    const session = await getAdminSession()
    return NextResponse.json(
      { authenticated: Boolean(session), email: session?.email, expiresAt: session?.expiresAt },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return authError(error)
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-origin sign-in requests are not allowed.' }, { status: 403 })
  }
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > 1024) {
    return NextResponse.json({ error: 'Sign-in request is too large.' }, { status: 413 })
  }

  try {
    const address = clientAddress(request)
    if (isRateLimited(address)) {
      return NextResponse.json(
        { error: 'Too many unsuccessful sign-in attempts. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(attemptWindowMs / 1000)) } },
      )
    }

    const body: unknown = await request.json()
    if (
      !body ||
      typeof body !== 'object' ||
      !('email' in body) ||
      !('password' in body) ||
      typeof body.email !== 'string' ||
      typeof body.password !== 'string' ||
      body.email.length > 254 ||
      body.password.length > 256
    ) {
      return NextResponse.json({ error: 'Enter a valid email and password.' }, { status: 400 })
    }

    if (!isAdminAuthConfigured()) {
      return NextResponse.json({ error: 'Admin access needs to be configured.' }, { status: 503 })
    }
    if (!verifyAdminCredentials(body.email, body.password)) {
      recordFailedAttempt(address)
      return NextResponse.json({ error: 'The email or password is incorrect.' }, { status: 401 })
    }

    const expiresAt = await createAdminSession(body.email)
    failedAttempts.delete(address)
    return NextResponse.json({ authenticated: true, expiresAt }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid sign-in request.' }, { status: 400 })
    }
    return authError(error)
  }
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-origin sign-out requests are not allowed.' }, { status: 403 })
  }

  await clearAdminSession()
  return NextResponse.json({ authenticated: false }, { headers: { 'Cache-Control': 'no-store' } })
}

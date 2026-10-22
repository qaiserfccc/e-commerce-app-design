import { NextRequest, NextResponse } from 'next/server'
import { isAdminRecoveryConfigured, resetAdminPasswordWithRecoveryKey } from '@/lib/auth/admin-recovery'

export const dynamic = 'force-dynamic'

const noStore = { 'Cache-Control': 'no-store' }

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')
  return origin === request.nextUrl.origin && request.headers.get('sec-fetch-site') !== 'cross-site'
}

export async function GET() {
  return NextResponse.json({ configured: isAdminRecoveryConfigured() }, { headers: noStore })
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-origin requests are not allowed.' }, { status: 403 })
  }
  if (Number(request.headers.get('content-length') ?? 0) > 2048) {
    return NextResponse.json({ error: 'Request is too large.' }, { status: 413 })
  }
  if (!isAdminRecoveryConfigured()) {
    return NextResponse.json({ error: 'Password recovery is not enabled for this site.' }, { status: 503, headers: noStore })
  }

  try {
    const body: unknown = await request.json()
    if (
      !body ||
      typeof body !== 'object' ||
      !('email' in body) ||
      !('recoveryKey' in body) ||
      !('newPassword' in body) ||
      typeof body.email !== 'string' ||
      typeof body.recoveryKey !== 'string' ||
      typeof body.newPassword !== 'string' ||
      body.email.length > 254 ||
      body.recoveryKey.length > 256
    ) {
      return NextResponse.json({ error: 'Enter your email, recovery key, and a new password.' }, { status: 400 })
    }
    if (!body.newPassword || body.newPassword.length > 256) {
      return NextResponse.json({ error: 'Enter a new password.' }, { status: 400 })
    }

    const ok = await resetAdminPasswordWithRecoveryKey({
      email: body.email,
      recoveryKey: body.recoveryKey,
      newPassword: body.newPassword,
    })
    if (!ok) {
      return NextResponse.json({ error: 'The email or recovery key is incorrect.' }, { status: 401, headers: noStore })
    }
    return NextResponse.json({ reset: true }, { headers: noStore })
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }
    console.error('[admin-password-reset] Request failed')
    return NextResponse.json({ error: 'Unable to reset the password.' }, { status: 500 })
  }
}

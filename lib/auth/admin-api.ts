import { NextResponse } from 'next/server'
import { AdminAuthError } from '@/lib/auth/admin'

export function adminApiError(error: unknown) {
  if (error instanceof AdminAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } })
  }
  console.error('[admin-api] Request failed', error instanceof Error ? error.name : 'UnknownError')
  return NextResponse.json(
    { error: 'The admin request could not be completed.' },
    { status: 500, headers: { 'Cache-Control': 'no-store' } },
  )
}

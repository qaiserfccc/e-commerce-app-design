import { NextRequest, NextResponse } from 'next/server'
import { syncIskProductCategories } from '@/app/actions/admin'
import { requireAdminSession } from '@/lib/auth/admin'
import { adminApiError } from '@/lib/auth/admin-api'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (
    request.headers.get('origin') !== request.nextUrl.origin ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  ) {
    return NextResponse.json({ error: 'Cross-origin category sync requests are not allowed.' }, { status: 403 })
  }
  try {
    await requireAdminSession('admin')
    return NextResponse.json(
      { data: await syncIskProductCategories() },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return adminApiError(error)
  }
}

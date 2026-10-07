import { NextRequest, NextResponse } from 'next/server'
import { getAllCustomers } from '@/app/actions/admin'
import { adminApiError } from '@/lib/auth/admin-api'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const rawOffset = url.searchParams.get('offset') ?? '0'
    const query = url.searchParams.get('q') ?? ''
    if (!/^\d+$/.test(rawOffset)) return NextResponse.json({ error: 'Customer page is invalid.' }, { status: 400 })
    if (!Number.isSafeInteger(Number(rawOffset)) || Number(rawOffset) > 1_000_000) {
      return NextResponse.json({ error: 'Customer page is invalid.' }, { status: 400 })
    }
    if (query.length > 100) return NextResponse.json({ error: 'Customer search is too long.' }, { status: 400 })
    const offset = Number(rawOffset)
    const result = await getAllCustomers(50, offset, query)
    return NextResponse.json({ data: result.items, total: result.total }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return adminApiError(error)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getAllOrders } from '@/app/actions/admin'
import { adminApiError } from '@/lib/auth/admin-api'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const rawOffset = url.searchParams.get('offset') ?? '0'
    const status = url.searchParams.get('status') ?? ''
    if (!/^\d+$/.test(rawOffset)) return NextResponse.json({ error: 'Order page is invalid.' }, { status: 400 })
    if (status && !['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'].includes(status)) {
      return NextResponse.json({ error: 'Order status filter is invalid.' }, { status: 400 })
    }
    const offset = Number(rawOffset)
    if (!Number.isSafeInteger(offset) || offset > 1_000_000) return NextResponse.json({ error: 'Order page is invalid.' }, { status: 400 })
    const result = await getAllOrders(50, offset, status)
    return NextResponse.json({ data: result.items, total: result.total }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return adminApiError(error)
  }
}

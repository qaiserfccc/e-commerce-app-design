import { NextRequest, NextResponse } from 'next/server'
import { getAdminProductSource } from '@/app/actions/admin'
import { adminApiError } from '@/lib/auth/admin-api'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const { productId } = await params
    const data = await getAdminProductSource(productId)
    if (!data) return NextResponse.json({ error: 'Product not found.' }, { status: 404 })
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return adminApiError(error)
  }
}

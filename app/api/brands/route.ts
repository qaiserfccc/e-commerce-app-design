import { NextResponse } from 'next/server'
import { getStorefrontBrands } from '@/lib/data/catalog'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json(
      { data: await getStorefrontBrands() },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } },
    )
  } catch (error) {
    console.error('[brands-api] Brand request failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 })
  }
}

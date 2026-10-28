import { NextRequest, NextResponse } from 'next/server'
import { getCatalog } from '@/lib/data/catalog'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const category = url.searchParams.get('category')
    const rawBrand = url.searchParams.get('brand')?.trim()
    const rawQuery = url.searchParams.get('q')?.trim()
    if (category && category.length > 100) return NextResponse.json({ error: 'Category filter is too long.' }, { status: 400 })
    if (rawBrand && rawBrand.length > 100) return NextResponse.json({ error: 'Brand filter is too long.' }, { status: 400 })
    if (rawQuery && rawQuery.length > 100) return NextResponse.json({ error: 'Search query is too long.' }, { status: 400 })
    const query = rawQuery

    const enrichedProducts = await getCatalog(category || null, query || null, rawBrand || null)

    return NextResponse.json(
      {
        data: enrichedProducts,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      },
    )
  } catch (error) {
    console.error('[products-api] Catalog request failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

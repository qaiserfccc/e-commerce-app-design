import { NextResponse } from 'next/server'
import { getActiveProductCategories } from '@/app/actions/storefront'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const categories = await getActiveProductCategories()
    return NextResponse.json(
      { data: categories },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } },
    )
  } catch (error) {
    console.error('[product-categories-api] Category request failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'Failed to fetch product categories' }, { status: 500 })
  }
}

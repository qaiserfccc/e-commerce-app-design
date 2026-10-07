import { NextRequest, NextResponse } from 'next/server'
import { getActiveProducts, getProductAssets } from '@/app/actions/storefront'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const category = url.searchParams.get('category')

    let products = await getActiveProducts()

    if (category) {
      products = products.filter((p) => p.category === category)
    }

    // Enrich products with assets
    const enrichedProducts = await Promise.all(
      products.map(async (product) => ({
        ...product,
        assets: await getProductAssets(product.id),
      })),
    )

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
    console.error('[v0] API error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

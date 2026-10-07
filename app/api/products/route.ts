import { NextRequest, NextResponse } from 'next/server'
import { getActiveProducts, getProductAssets, getProductsByCategory, searchProducts } from '@/app/actions/storefront'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const category = url.searchParams.get('category')
    const rawQuery = url.searchParams.get('q')?.trim()
    if (category && category.length > 100) return NextResponse.json({ error: 'Category filter is too long.' }, { status: 400 })
    if (rawQuery && rawQuery.length > 100) return NextResponse.json({ error: 'Search query is too long.' }, { status: 400 })
    const query = rawQuery

    let products = query ? await searchProducts(query) : category ? await getProductsByCategory(category) : await getActiveProducts()
    if (query && category) products = products.filter((product) => product.category === category)

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
    console.error('[products-api] Catalog request failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

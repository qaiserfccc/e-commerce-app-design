import { NextRequest, NextResponse } from 'next/server'
import {
  getActiveProductVariantsForProducts,
  getActiveProducts,
  getProductAssetsForProducts,
  getProductsByCategory,
  searchProducts,
} from '@/app/actions/storefront'

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

    const productIds = products.map((product) => product.id)
    const [assets, variants] = await Promise.all([
      getProductAssetsForProducts(productIds),
      getActiveProductVariantsForProducts(productIds),
    ])
    const assetsByProduct = new Map<string, typeof assets>()
    const variantsByProduct = new Map<string, typeof variants>()
    for (const asset of assets) {
      const productAssets = assetsByProduct.get(asset.productId) ?? []
      productAssets.push(asset)
      assetsByProduct.set(asset.productId, productAssets)
    }
    for (const variant of variants) {
      const productVariants = variantsByProduct.get(variant.productId) ?? []
      productVariants.push(variant)
      variantsByProduct.set(variant.productId, productVariants)
    }
    const enrichedProducts = products.map((product) => ({
      ...product,
      assets: assetsByProduct.get(product.id) ?? [],
      variants: variantsByProduct.get(product.id) ?? [],
    }))

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

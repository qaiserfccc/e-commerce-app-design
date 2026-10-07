import { NextResponse } from 'next/server'
import { getAllProductAssets, getAllProducts } from '@/app/actions/admin'
import { adminApiError } from '@/lib/auth/admin-api'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [products, assets] = await Promise.all([getAllProducts(), getAllProductAssets()])
    const byProduct = new Map<string, typeof assets>()
    for (const asset of assets) {
      const productAssets = byProduct.get(asset.productId) ?? []
      productAssets.push(asset)
      byProduct.set(asset.productId, productAssets)
    }
    return NextResponse.json(
      { data: products.map((product) => ({ ...product, assets: byProduct.get(product.id) ?? [] })) },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return adminApiError(error)
  }
}

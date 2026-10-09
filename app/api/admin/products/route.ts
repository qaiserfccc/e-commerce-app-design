import { NextResponse } from 'next/server'
import { getAllProductAssets, getAllProductVariants, getAllProducts } from '@/app/actions/admin'
import { adminApiError } from '@/lib/auth/admin-api'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [products, assets, variants] = await Promise.all([
      getAllProducts(),
      getAllProductAssets(),
      getAllProductVariants(),
    ])
    const byProduct = new Map<string, typeof assets>()
    for (const asset of assets) {
      const productAssets = byProduct.get(asset.productId) ?? []
      productAssets.push(asset)
      byProduct.set(asset.productId, productAssets)
    }
    const variantsByProduct = new Map<string, typeof variants>()
    for (const variant of variants) {
      const productVariants = variantsByProduct.get(variant.productId) ?? []
      productVariants.push(variant)
      variantsByProduct.set(variant.productId, productVariants)
    }
    return NextResponse.json(
      {
        data: products.map((product) => ({
          ...product,
          assets: byProduct.get(product.id) ?? [],
          variants: variantsByProduct.get(product.id) ?? [],
        })),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return adminApiError(error)
  }
}

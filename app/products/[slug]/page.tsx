import { notFound } from 'next/navigation'
import { getActiveProductVariants, getProductAssets, getProductBySlug } from '@/app/actions/storefront'
import { StorefrontProductDetail } from '@/components/storefront/product-detail'
import type { Product } from '@/lib/hooks/use-storefront-data'

export const dynamic = 'force-dynamic'

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) notFound()
  const product = await getProductBySlug(slug)
  if (!product) notFound()
  const [assets, variants] = await Promise.all([
    getProductAssets(product.id),
    getActiveProductVariants(product.id),
  ])
  const initialProduct: Product = {
    ...product,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    assets: assets.map((asset) => ({
      ...asset,
      createdAt: asset.createdAt.toISOString(),
    })),
    variants,
  }
  return <StorefrontProductDetail initialProduct={initialProduct} />
}

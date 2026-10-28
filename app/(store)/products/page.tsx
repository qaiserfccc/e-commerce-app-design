import { Suspense } from 'react'
import type { Metadata } from 'next'
import { CatalogView } from '@/components/storefront/catalog-view'
import { getStorefrontBrands } from '@/lib/data/catalog'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Products — ISK Lenses',
  description: 'Browse the full contact lens catalog.',
}

export default async function ProductsPage() {
  const brands = await getStorefrontBrands()
  return <Suspense fallback={null}><CatalogView brands={brands} /></Suspense>
}

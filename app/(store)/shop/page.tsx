import { Suspense } from 'react'
import type { Metadata } from 'next'
import { CatalogView } from '@/components/storefront/catalog-view'
import { getStorefrontBrands } from '@/lib/data/catalog'

export const metadata: Metadata = { title: 'Shop contact lenses', description: 'Browse all contact lenses by brand, collection and color.' }
export const dynamic = 'force-dynamic'

export default async function ShopPage() {
  const brands = await getStorefrontBrands()
  return <Suspense fallback={null}><CatalogView brands={brands} /></Suspense>
}

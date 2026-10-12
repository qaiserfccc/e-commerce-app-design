import { Suspense } from 'react'
import type { Metadata } from 'next'
import { CatalogView } from '@/components/storefront/catalog-view'

export const metadata: Metadata = { title: 'Shop contact lenses', description: 'Browse all contact lenses by brand, collection and color.' }

export default function ShopPage() {
  return <Suspense fallback={null}><CatalogView /></Suspense>
}

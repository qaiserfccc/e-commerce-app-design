import { Suspense } from 'react'
import { CatalogView } from '@/components/storefront/catalog-view'

export default async function CategoryPage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const slug = decodeURIComponent(path[path.length - 1] ?? '')
  return <Suspense fallback={null}><CatalogView categorySlug={slug} /></Suspense>
}

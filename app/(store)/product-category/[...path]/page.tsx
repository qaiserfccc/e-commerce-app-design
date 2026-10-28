import { Suspense } from 'react'
import { CatalogView } from '@/components/storefront/catalog-view'
import { getCategories, getStorefrontBrands } from '@/lib/data/catalog'

export const dynamic = 'force-dynamic'

export default async function CategoryPage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const requested = path.map((segment) => decodeURIComponent(segment)).join('/')
  const [categories, brands] = await Promise.all([getCategories(), getStorefrontBrands()])
  const match = categories.find((item) => item.path === requested) ?? categories.find((item) => item.slug === path[path.length - 1])
  return <Suspense fallback={null}><CatalogView categoryPath={match?.path ?? requested} brands={brands} /></Suspense>
}

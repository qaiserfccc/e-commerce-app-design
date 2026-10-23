import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { CatalogView } from '@/components/storefront/catalog-view'
import { getCategories } from '@/lib/data/catalog'

export const dynamic = 'force-dynamic'

export default async function CategoryPage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const requested = path.map((segment) => decodeURIComponent(segment)).join('/')
  const categories = await getCategories()
  // Short links like /product-category/bella resolve by their last slug and redirect to the canonical nested path.
  const match = categories.find((item) => item.path === requested) ?? categories.find((item) => item.slug === path[path.length - 1])
  if (match && match.path !== requested) redirect(`/product-category/${match.path}`)
  return <Suspense fallback={null}><CatalogView categoryPath={requested} /></Suspense>
}

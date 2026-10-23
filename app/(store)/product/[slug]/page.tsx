import { notFound } from 'next/navigation'
import { StorefrontProductDetail } from '@/components/storefront/product-detail'
import { getApprovedReviews, getCategories, getProduct, getProductPageSettings, getProductSections } from '@/lib/data/catalog'
import type { Product } from '@/lib/hooks/use-storefront-data'

export const dynamic = 'force-dynamic'

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ option?: string }>
}) {
  const [{ slug }, { option }] = await Promise.all([params, searchParams])
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) notFound()
  const product = await getProduct(slug)
  if (!product) notFound()
  const [reviews, sections, settings, categories] = await Promise.all([
    getApprovedReviews(product.id),
    getProductSections({ id: product.id, categoryId: product.categoryId }),
    getProductPageSettings(),
    getCategories(),
  ])
  const breadcrumbs = []
  let current = categories.find((item) => item.id === product.categoryId)
  while (current) {
    breadcrumbs.unshift({ name: current.name, path: current.path })
    current = current.parentId ? categories.find((item) => item.id === current!.parentId) : undefined
  }
  const serialize = <T,>(value: T): T => JSON.parse(JSON.stringify(value))
  return (
    <StorefrontProductDetail
      initialProduct={serialize(product) as unknown as Product}
      initialOptionId={option}
      reviews={serialize(reviews) as unknown as Parameters<typeof StorefrontProductDetail>[0]["reviews"]}
      reviewSettings={settings.reviews}
      sections={serialize(sections) as unknown as { id: string; title: string; products: Product[] }[]}
      breadcrumbs={breadcrumbs}
    />
  )
}

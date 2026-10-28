import ProductPage from '../../product/[slug]/page'

export default function ProductsProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ option?: string }>
}) {
  return <ProductPage params={params} searchParams={searchParams} />
}

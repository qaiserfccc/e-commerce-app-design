'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { SlidersHorizontal } from 'lucide-react'
import { ProductCard, ProductGridSkeleton } from '@/components/storefront/product-card'
import { categoryBranchIds, productsInCategory } from '@/components/storefront/category-navigation'
import { useProducts } from '@/lib/hooks/use-storefront-data'
import { useStorefrontCart } from '@/lib/hooks/use-storefront-cart'
import { useStorefrontCategories } from '@/lib/hooks/use-storefront-categories'
import { categoryHref, categoryTree, isAvailable, lowestPrice, titleCase } from '@/lib/store-config'

const PAGE_SIZE = 24
type Sort = 'default' | 'price-asc' | 'price-desc' | 'name'

export function CatalogView({ categorySlug }: { categorySlug?: string }) {
  const searchParams = useSearchParams()
  const query = searchParams.get('q')?.trim().slice(0, 100) ?? ''
  const { products, isLoading, isError, error, mutate } = useProducts(undefined, query)
  const { categories, isLoading: categoriesLoading } = useStorefrontCategories()
  const { syncProducts } = useStorefrontCart()
  const [sort, setSort] = useState<Sort>('default')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const tree = useMemo(() => categoryTree(categories), [categories])
  const category = categorySlug ? categories.find((item) => item.slug === categorySlug) ?? null : null
  const categoryId = category?.sourceCategoryId ?? null
  const branch = useMemo(() => categoryBranchIds(categories, categoryId), [categories, categoryId])
  const parent = category ? categories.find((item) => item.sourceCategoryId === category.parentSourceCategoryId) : null
  const siblings = category ? tree.get(category.sourceCategoryId) ?? [] : tree.get(0) ?? []

  useEffect(() => {
    if (!isLoading && !isError && !query) syncProducts(products)
  }, [isError, isLoading, products, query, syncProducts])

  useEffect(() => setVisible(PAGE_SIZE), [categorySlug, query, sort, inStockOnly])

  const filtered = useMemo(() => {
    const result = products.filter((product) => productsInCategory(product, categoryId, branch) && (!inStockOnly || isAvailable(product)))
    const price = (product: (typeof result)[number]) => Number(lowestPrice(product).price)
    if (sort === 'price-asc') result.sort((a, b) => price(a) - price(b))
    else if (sort === 'price-desc') result.sort((a, b) => price(b) - price(a))
    else if (sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name))
    return result
  }, [branch, categoryId, inStockOnly, products, sort])

  const missingCategory = Boolean(categorySlug) && !categoriesLoading && !category
  const heading = query ? `Search results for “${query}”` : category ? titleCase(category.name) : 'Shop'

  const sidebar = (
    <nav aria-label="Categories">
      <h2 className="text-sm font-bold uppercase tracking-widest text-[#033473]">{category ? 'Collections' : 'Categories'}</h2>
      <ul className="mt-3 space-y-1 text-sm">
        {category && (
          <li>
            <Link href={parent ? categoryHref(parent) : '/shop'} className="inline-block py-1.5 font-medium text-[#4a5568] hover:text-[#033473]">← {parent ? titleCase(parent.name) : 'All products'}</Link>
          </li>
        )}
        {siblings.map((item) => (
          <li key={item.sourceCategoryId}>
            <Link href={categoryHref(item)} className="flex items-center justify-between rounded-lg px-3 py-2 font-medium hover:bg-[#eef3fa] hover:text-[#033473]">
              <span>{titleCase(item.name)}</span>
              <span className="text-xs text-[#4a5568]">{item.sourceProductCount}</span>
            </Link>
          </li>
        ))}
        {!siblings.length && category && <li className="px-3 py-2 text-[#4a5568]">No sub-collections.</li>}
      </ul>
    </nav>
  )

  return (
    <main className="mx-auto max-w-[1320px] px-4 pb-8 pt-6 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-xs text-[#4a5568]">
        <Link href="/" className="hover:underline">Home</Link> / <Link href="/shop" className="hover:underline">Shop</Link>
        {parent && <> / <Link href={categoryHref(parent)} className="hover:underline">{titleCase(parent.name)}</Link></>}
        {category && <> / <span className="font-semibold text-[#0a0a0a]">{titleCase(category.name)}</span></>}
      </nav>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-[#033473]/15 pb-5">
        <h1 className="text-3xl font-bold tracking-tight text-[#033473] sm:text-4xl">{heading}</h1>
        <p className="text-sm text-[#4a5568]" aria-live="polite">{isLoading ? 'Loading…' : `${filtered.length} ${filtered.length === 1 ? 'product' : 'products'}`}</p>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[250px_1fr]">
        <aside className="hidden lg:block">{sidebar}</aside>
        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} className="inline-flex items-center gap-2 rounded-full border border-[#033473]/30 px-4 py-2 text-sm font-semibold lg:hidden">
              <SlidersHorizontal size={16} aria-hidden="true" /> Categories
            </button>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={inStockOnly} onChange={(event) => setInStockOnly(event.target.checked)} className="size-4 accent-[#033473]" /> In stock only
            </label>
            <label className="ml-auto inline-flex items-center gap-2 text-sm">
              <span className="text-[#4a5568]">Sort by</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="rounded-full border border-[#033473]/30 bg-white px-3 py-2 text-sm">
                <option value="default">Default</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>
          {filtersOpen && <div className="mb-6 rounded-xl bg-[#eef3fa] p-4 lg:hidden">{sidebar}</div>}

          {isError ? (
            <div role="alert" className="rounded-xl border border-[#b20000]/30 bg-[#fff4f2] px-5 py-4 text-sm text-[#7a1c1c]">
              {error instanceof Error ? error.message : 'Products could not be loaded.'}{' '}
              <button type="button" onClick={() => void mutate()} className="font-bold underline">Try again</button>
            </div>
          ) : isLoading ? (
            <ProductGridSkeleton />
          ) : missingCategory ? (
            <EmptyState title="Collection not found" body="This collection does not exist or has been removed." />
          ) : filtered.length === 0 ? (
            <EmptyState title="No products found" body={query ? 'Try a different search term.' : 'No products are available here right now.'} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
                {filtered.slice(0, visible).map((product) => <ProductCard key={product.id} product={product} />)}
              </div>
              {visible < filtered.length && (
                <div className="mt-10 text-center">
                  <button type="button" onClick={() => setVisible((value) => value + PAGE_SIZE)} className="rounded-full border border-[#033473] px-8 py-3 text-sm font-semibold text-[#033473] hover:bg-[#033473] hover:text-white">
                    Load more ({filtered.length - visible} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-[#eef3fa] px-6 py-14 text-center">
      <h2 className="text-xl font-bold text-[#033473]">{title}</h2>
      <p className="mt-2 text-sm text-[#4a5568]">{body}</p>
      <Link href="/shop" className="mt-5 inline-block rounded-full bg-[#033473] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0a4fa3]">Browse all products</Link>
    </div>
  )
}

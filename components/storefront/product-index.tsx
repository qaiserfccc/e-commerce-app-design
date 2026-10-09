'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Search } from 'lucide-react'
import { useProducts, type Product } from '@/lib/hooks/use-storefront-data'

function formatPrice(value: string, currency: string) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return `${currency} ${value}`
  try {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

function ProductEntry({ product }: { product: Product }) {
  const variants = product.variants ?? []
  const firstVariant = variants.reduce<(typeof variants)[number] | undefined>((lowest, variant) =>
    !lowest || Number(variant.price) < Number(lowest.price) ? variant : lowest,
  undefined)
  const price = firstVariant?.price ?? product.price
  const currency = firstVariant?.currency ?? product.currency
  const image = product.heroImageUrl ??
    product.assets?.find((asset) => asset.mediaType === 'image' && asset.blobUrl)?.blobUrl

  return (
    <article className="min-w-0 border-b border-[#152a52]/25 pb-5">
      <Link
        href={`/products/${product.slug}`}
        aria-label={`View ${product.name}`}
        className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#16468a]"
      >
        <div className="relative aspect-[.94] overflow-hidden bg-[#dbe7e1]">
          {image ? (
            <img src={image} alt={product.name} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.025]" />
          ) : (
            <div role="img" aria-label={`No product media uploaded for ${product.name}`} className="product-placeholder grid size-full place-items-center">
              <span className="bg-[#edf4ef] px-3 py-2 font-mono text-[10px] uppercase tracking-[.12em] text-[#152a52]">No product photo</span>
            </div>
          )}
          <span className="absolute left-3 top-3 max-w-[80%] truncate bg-[#152a52] px-3 py-2 font-mono text-[10px] uppercase tracking-[.12em] text-[#d3ff48]">
            {product.category}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3 pt-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold leading-5 group-hover:underline">{product.name}</h2>
            <p className="mt-1 text-xs text-[#314a63]">
              {variants.length
                ? `${variants.length} listed ${variants.length === 1 ? 'option' : 'options'}`
                : `${product.stockQuantity} ${product.stockQuantity === 1 ? 'unit' : 'units'} in stock`}
            </p>
          </div>
          <span className="shrink-0 font-mono text-xs font-semibold">{variants.length ? 'From ' : ''}{formatPrice(price, currency)}</span>
        </div>
      </Link>

      {variants.length > 0 ? (
        <nav aria-label={`${product.name} listed options`} className="mt-4 flex flex-wrap gap-2">
          {variants.map((variant) => (
            <Link
              key={variant.id}
              href={`/products/${product.slug}?option=${encodeURIComponent(variant.id)}#listed-options`}
              className="max-w-full truncate border border-[#152a52]/30 px-2.5 py-2 text-[10px] font-bold uppercase tracking-[.06em] hover:bg-[#d3ff48] focus-visible:outline-2 focus-visible:outline-[#16468a]"
            >
              {variant.name}
              {variant.color ? ` · ${variant.color}` : ''}
              {variant.powerDiopters ? ` · ${variant.powerDiopters} D` : ''}
            </Link>
          ))}
        </nav>
      ) : (
        <p className="mt-4 border-t border-[#152a52]/10 pt-3 text-xs leading-5 text-[#314a63]">
          No lens options are recorded for this listing.
        </p>
      )}
      <Link
        href={`/products/${product.slug}`}
        className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.13em] underline decoration-[#16468a]/50 underline-offset-4 hover:text-[#16468a] focus-visible:outline-2 focus-visible:outline-[#16468a]"
      >
        View listing <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </article>
  )
}

export function StorefrontProductIndex() {
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const { products, isLoading, isError, error } = useProducts()
  const categories = useMemo(() => [...new Set(products.map((product) => product.category))].sort(), [products])
  const filteredProducts = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase()
    return products.filter((product) =>
      (!category || product.category === category) &&
      (!needle || `${product.name} ${product.category} ${product.slug}`.toLocaleLowerCase().includes(needle)),
    )
  }, [category, products, search])

  return (
    <main className="mx-auto min-h-screen max-w-[1500px] bg-[#edf4ef] px-5 pb-24 text-[#152a52] sm:px-8 lg:px-12">
      <div hidden dangerouslySetInnerHTML={{ __html: '<!-- THESIS: The full ISK catalog is a navigable index, not a short featured-product carousel. OWN-WORLD: Ink-blue category rail, chartreuse selection, leaf-paper ground, compressed display type, open specimen entries. STORY: Shoppers scan every published product, filter by its stored category, and jump directly to a real listed option when one exists. FIRST VIEWPORT: A split index masthead places the catalog title and live count opposite a concise search field; collection navigation follows immediately. FORM: A browsable catalog index extends the established Chromatic Specimen Index; category and option links stay factual and work on narrow screens. No source media is represented as a product photo.' }} />
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#152a52]/20 py-4">
        <Link href="/" className="font-black uppercase tracking-[-.04em] focus-visible:outline-2 focus-visible:outline-[#16468a]">
          ISK Lenses <span className="font-mono text-[10px] font-bold tracking-[.14em]">/ Product index</span>
        </Link>
        <nav aria-label="Store navigation" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold uppercase tracking-[.1em]">
          <Link aria-current="page" href="/products" className="underline decoration-[#16468a] underline-offset-4 focus-visible:outline-2 focus-visible:outline-[#16468a]">Products</Link>
          <Link href="/#catalogue-notes" className="text-[#314a63] hover:text-[#16468a] focus-visible:outline-2 focus-visible:outline-[#16468a]">How to read listings</Link>
        </nav>
      </header>

      <section className="mt-5 grid gap-8 bg-[#152a52] px-6 py-8 text-[#edf4ef] sm:px-10 sm:py-10 lg:grid-cols-[1fr_auto] lg:items-end lg:px-14">
        <div>
          <h1 className="display-type max-w-3xl text-[clamp(3rem,7vw,5.5rem)] uppercase leading-[.86] tracking-[-.035em]">
            Every listing.<br /><span className="text-[#d3ff48]">One index.</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-[#edf4ef]">
            Browse the published catalog by collection. Product options appear only when they are recorded for that listing.
          </p>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[.15em] text-[#d3ff48]" aria-live="polite">
            {isLoading ? 'Loading catalog…' : `${products.length} published ${products.length === 1 ? 'listing' : 'listings'} · ${categories.length} categories`}
          </p>
        </div>
        <label className="flex min-w-0 items-center border border-[#edf4ef]/50 bg-[#edf4ef] px-3 py-3 text-[#152a52] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#d3ff48] sm:min-w-72">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search the product catalog</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products"
            className="min-w-0 flex-1 bg-transparent pl-2 text-sm outline-none placeholder:text-[#314a63]"
          />
        </label>
      </section>

      <section id="collection" className="scroll-mt-6 pt-12">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-[#152a52] pb-4">
          <h2 className="display-type text-4xl uppercase leading-none tracking-[-.025em] sm:text-5xl">Browse collections</h2>
          <p className="font-mono text-[10px] uppercase tracking-[.13em] text-[#314a63]" aria-live="polite">
            {isLoading ? 'Updating index' : `${filteredProducts.length} ${filteredProducts.length === 1 ? 'result' : 'results'}`}
          </p>
        </div>

        {!isError && !isLoading && products.length > 0 && (
          <nav aria-label="Filter products by category" className="flex snap-x gap-2 overflow-x-auto border-b border-[#152a52]/20 py-4">
            <button
              type="button"
              onClick={() => setCategory('')}
              aria-pressed={!category}
              className={`shrink-0 px-3 py-2 text-[10px] font-bold uppercase tracking-[.1em] focus-visible:outline-2 focus-visible:outline-[#16468a] ${!category ? 'bg-[#152a52] text-[#d3ff48]' : 'border border-[#152a52]/25 hover:bg-[#dbe7e1]'}`}
            >
              All products · {products.length}
            </button>
            {categories.map((item) => {
              const count = products.filter((product) => product.category === item).length
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  aria-pressed={category === item}
                  className={`max-w-64 shrink-0 truncate px-3 py-2 text-[10px] font-bold uppercase tracking-[.1em] focus-visible:outline-2 focus-visible:outline-[#16468a] ${category === item ? 'bg-[#152a52] text-[#d3ff48]' : 'border border-[#152a52]/25 hover:bg-[#dbe7e1]'}`}
                >
                  {item} · {count}
                </button>
              )
            })}
          </nav>
        )}

        {isError ? (
          <div role="alert" className="mt-7 border border-[#a52d3c]/35 bg-[#fff4f2] px-5 py-4 text-sm text-[#782b36]">
            {error instanceof Error ? error.message : 'The product catalog could not be loaded. Refresh the page to try again.'}
          </div>
        ) : isLoading ? (
          <div className="grid gap-x-5 gap-y-10 py-8 sm:grid-cols-2 lg:grid-cols-4" aria-label="Loading products">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => <div key={item} className="aspect-[.94] animate-pulse bg-[#dbe7e1]" />)}
          </div>
        ) : filteredProducts.length ? (
          <div className="grid gap-x-5 gap-y-10 py-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => <ProductEntry key={product.id} product={product} />)}
          </div>
        ) : (
          <div className="mt-8 border border-[#152a52]/20 bg-[#e4eee9] px-6 py-10">
            <h3 className="text-xl font-black tracking-[-.03em]">{products.length ? 'No matching listings.' : 'No products are published yet.'}</h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#314a63]">
              {products.length ? 'Try a different search or collection.' : 'Published products will appear here when they are available in the catalog.'}
            </p>
          </div>
        )}
      </section>

      <footer className="mt-20 flex flex-wrap justify-between gap-4 border-t border-[#152a52]/25 pt-5 font-mono text-[10px] uppercase tracking-[.13em] text-[#314a63]">
        <Link href="/" className="underline underline-offset-4 hover:text-[#16468a] focus-visible:outline-2 focus-visible:outline-[#16468a]">ISK Lenses · Return to home</Link>
        <span>Browse only · Checkout unavailable</span>
      </footer>
    </main>
  )
}

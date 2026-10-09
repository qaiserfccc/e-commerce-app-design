'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowRight, Search, ShoppingBag } from 'lucide-react'
import { StorefrontBag } from '@/components/storefront/storefront-bag'
import { useStorefrontCart } from '@/lib/hooks/use-storefront-cart'
import { useProducts, type Product } from '@/lib/hooks/use-storefront-data'

function priceLabel(value: string, currency: string) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return `${currency} ${value}`
  try {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

function productImage(product: Product) {
  return product.heroImageUrl ??
    product.assets?.find((asset) => asset.mediaType === 'image' && asset.blobUrl)?.blobUrl ??
    null
}

function ProductCard({ product, addToBag }: { product: Product; addToBag: (product: Product) => void }) {
  const image = productImage(product)
  const options = product.variants?.length ?? 0
  const unavailable = options
    ? !product.variants?.some((variant) => variant.stockQuantity > 0)
    : product.stockQuantity === 0
  const minVariant = product.variants?.length
    ? product.variants.reduce((lowest, variant) =>
        Number(variant.price) < Number(lowest.price) ? variant : lowest,
      )
    : undefined
  const price = minVariant?.price ?? product.price
  const currency = minVariant?.currency ?? product.currency

  return (
    <article className="group min-w-0">
      <Link
        href={`/products/${product.slug}`}
        aria-label={`View ${product.name}`}
        className="block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#16468a]"
      >
        <div className="relative aspect-[.94] overflow-hidden bg-[#dbe7e1]">
          {image ? (
            <img src={image} alt={product.name} loading="lazy" className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.035]" />
          ) : (
            <div aria-hidden="true" className="product-placeholder size-full" />
          )}
          <span className="absolute left-3 top-3 max-w-[75%] truncate bg-[#edf4ef] px-3 py-2 font-mono text-[10px] uppercase tracking-[.14em] text-[#152a52]">
            {product.category}
          </span>
          <span className="absolute bottom-3 right-3 grid size-11 place-items-center rounded-full bg-[#d3ff48] text-[#152a52] transition-transform group-hover:rotate-45">
            <ArrowRight size={18} aria-hidden="true" />
          </span>
        </div>
      </Link>
      <div className="flex items-start justify-between gap-3 border-b border-[#152a52]/25 py-4">
        <div className="min-w-0">
          <Link href={`/products/${product.slug}`} className="font-semibold leading-5 hover:underline focus-visible:outline-2 focus-visible:outline-[#16468a]">
            {product.name}
          </Link>
          <p className="mt-1 text-xs text-[#314a63]">
            {options
              ? `${options} ${options === 1 ? 'option' : 'options'}${unavailable ? ' · unavailable' : ''}`
              : product.stockQuantity > 0 ? 'Available' : 'Unavailable'}
          </p>
        </div>
        <span className="shrink-0 font-mono text-xs font-semibold">{options ? 'From ' : ''}{priceLabel(price, currency)}</span>
      </div>
      {product.description && <p className="mt-3 line-clamp-2 text-xs leading-5 text-[#314a63]">{product.description}</p>}
      {!options && product.stockQuantity > 0 && (
        <button
          type="button"
          onClick={() => addToBag(product)}
          className="mt-3 text-xs font-bold uppercase tracking-[.12em] underline decoration-[#16468a]/50 underline-offset-4 hover:text-[#16468a] focus-visible:outline-2 focus-visible:outline-[#16468a]"
        >
          Add to bag
        </button>
      )}
    </article>
  )
}

export function StorefrontPanel() {
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [bagOpen, setBagOpen] = useState(false)
  const deferredSearch = useDeferredValue(search)
  const { products: allProducts, isLoading, isError: allProductsError, error } = useProducts()
  const { products, isLoading: filteredLoading, isError: filteredError, error: filteredRequestError } = useProducts(
    category || undefined,
    deferredSearch || undefined,
  )
  const { add, count, syncProducts } = useStorefrontCart()
  const categories = useMemo(() => [...new Set(allProducts.map((product) => product.category))].sort(), [allProducts])

  useEffect(() => {
    if (!isLoading && !allProductsError) syncProducts(allProducts)
  }, [allProducts, allProductsError, isLoading, syncProducts])

  return (
    <div className="mx-auto max-w-[1500px] px-5 pb-24 sm:px-8 lg:px-12">
      <div hidden dangerouslySetInnerHTML={{ __html: '<!-- THESIS: An eye-color contact-lens catalogue reads as an index of published products, not a generic beauty hero. OWN-WORLD: Ink-blue fields, electric chartreuse indexing, cool leaf-white stock; compressed display type, tabular mono labels, unboxed product plates. STORY: Shoppers browse the live catalog by category and open listings to compare the options and product facts actually published; no clinical claim or checkout is implied. FIRST VIEWPORT: A split ink-blue field puts the product proposition and catalogue action at left and a large abstract lens study at right; the live-product count anchors the lower edge. FORM: Grounded direction 7, the chromatic specimen index, adapted to the product-option bellows staging; seed 0d4d3b24.' }} />
      <nav aria-label="Store navigation" className="flex min-h-[66px] items-center justify-between gap-4 border-b border-[#152a52]/20 py-3">
        <div className="flex flex-wrap items-center gap-x-7 gap-y-2 text-xs font-bold uppercase tracking-[.12em]">
          <a href="#collection" className="hover:text-[#16468a] focus-visible:outline-2 focus-visible:outline-[#16468a]">Products</a>
          <a href="#collection" className="hidden text-[#314a63] hover:text-[#16468a] sm:inline">Color index</a>
          <a href="#catalogue-notes" className="hidden text-[#314a63] hover:text-[#16468a] sm:inline">How to read listings</a>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center border border-[#152a52]/25 bg-white px-3 py-2.5 focus-within:outline-2 focus-within:outline-[#16468a]">
            <Search size={15} aria-hidden="true" />
            <span className="sr-only">Search products</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search lenses"
              className="w-28 bg-transparent pl-2 text-xs outline-none placeholder:text-[#314a63] sm:w-44"
            />
          </label>
          <button
            type="button"
            onClick={() => setBagOpen((open) => !open)}
            aria-expanded={bagOpen}
            aria-controls="shopping-bag"
            className="inline-flex items-center gap-2 border border-[#152a52] bg-[#152a52] px-3 py-2.5 text-xs font-bold uppercase tracking-[.08em] text-[#d3ff48] hover:bg-[#16468a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16468a] sm:px-4"
          >
            <ShoppingBag size={15} aria-hidden="true" /> <span className="hidden sm:inline">Bag</span> {count}
          </button>
        </div>
      </nav>

      <StorefrontBag open={bagOpen} onClose={() => setBagOpen(false)} />

      <section className="mt-5 grid overflow-hidden bg-[#152a52] text-[#edf4ef] lg:min-h-[545px] lg:grid-cols-[.94fr_1.06fr]">
        <div className="flex flex-col items-start justify-between gap-10 px-6 py-9 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.22em] text-[#d3ff48]">ISK Lenses · Product index</p>
            <h1 className="display-type mt-8 max-w-[620px] text-[clamp(3.2rem,8vw,6rem)] uppercase leading-[.84] tracking-[-.035em]">
              Contact lenses.<br /><span className="text-[#d3ff48]">In color.</span>
            </h1>
            <p className="mt-8 max-w-[430px] text-sm leading-6 text-[#e0eae6] sm:text-base sm:leading-7">
              Browse contact lenses by collection. Compare the options, prices, and availability published for each product.
            </p>
            <a href="#collection" className="mt-8 inline-flex items-center gap-4 bg-[#d3ff48] px-5 py-4 text-xs font-black uppercase tracking-[.13em] text-[#152a52] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              Explore products <ArrowDown size={16} aria-hidden="true" />
            </a>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[.13em] text-[#dbe7e1]">
            Published products <span className="ml-2 text-[#d3ff48]">{isLoading ? '…' : allProducts.length}</span>
          </p>
        </div>
        <div
          aria-label="Abstract optical study illustrating a contact-lens catalogue"
          role="img"
          data-selected={Boolean(category)}
          className="lens-study relative grid min-h-[300px] place-items-center overflow-hidden border-t border-[#d3ff48]/30 sm:min-h-[390px] lg:min-h-full lg:border-l lg:border-t-0"
        >
          <div className="absolute left-5 top-5 font-mono text-[10px] uppercase tracking-[.18em] text-[#d3ff48] sm:left-8 sm:top-8">Colour / option / availability</div>
          <div className="lens-crosshair" />
          <span className="absolute bottom-5 right-5 max-w-36 text-right font-mono text-[10px] uppercase leading-4 tracking-[.12em] text-[#edf4ef] sm:bottom-8 sm:right-8">
            Abstract optical study<br />Not a product photograph
          </span>
          <span className="sr-only">This illustration is decorative and does not show a product or lens specification.</span>
        </div>
      </section>

      <section id="collection" className="scroll-mt-6 pt-20">
        <div className="grid gap-6 border-b-2 border-[#152a52] pb-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <h2 className="display-type text-5xl uppercase leading-none tracking-[-.025em] sm:text-6xl">The live catalogue</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#314a63]">Listings and availability are loaded from the store database. Open a product to see its published options.</p>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[.14em] text-[#314a63]">
            {isLoading || filteredLoading ? 'Updating index' : `${products.length} ${products.length === 1 ? 'listing' : 'listings'}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-[#152a52]/20 py-4" aria-label="Filter by product category">
          <button
            type="button"
            onClick={() => setCategory('')}
            aria-pressed={!category}
            className={`px-3 py-2 text-[10px] font-bold uppercase tracking-[.1em] focus-visible:outline-2 focus-visible:outline-[#16468a] ${!category ? 'bg-[#152a52] text-[#d3ff48]' : 'border border-[#152a52]/25 bg-transparent hover:bg-[#dbe7e1]'}`}
          >
            All products
          </button>
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
              className={`max-w-full truncate px-3 py-2 text-[10px] font-bold uppercase tracking-[.1em] focus-visible:outline-2 focus-visible:outline-[#16468a] ${category === item ? 'bg-[#152a52] text-[#d3ff48]' : 'border border-[#152a52]/25 bg-transparent hover:bg-[#dbe7e1]'}`}
            >
              {item}
            </button>
          ))}
        </div>

        {allProductsError || filteredError ? (
          <div role="alert" className="mt-6 border border-[#a52d3c]/35 bg-[#fff4f2] px-5 py-4 text-sm text-[#782b36]">
            {(filteredError ? filteredRequestError : error) instanceof Error
              ? (filteredError ? filteredRequestError : error)?.message
              : 'The catalogue could not be loaded. Refresh the page to try again.'}
          </div>
        ) : isLoading ? (
          <div className="grid gap-x-5 gap-y-9 py-8 sm:grid-cols-2 lg:grid-cols-4" aria-label="Loading catalogue">
            {[0, 1, 2, 3].map((item) => <div key={item} className="aspect-[.94] animate-pulse bg-[#dbe7e1]" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="relative mt-8 overflow-hidden border border-[#152a52]/20 bg-[#e4eee9] px-6 py-12 sm:px-10">
            <div className="absolute -right-20 -top-24 size-72 rounded-full border border-[#16468a]/25" aria-hidden="true" />
            <div className="absolute -right-8 -top-12 size-48 rounded-full border-[20px] border-[#d3ff48]/75" aria-hidden="true" />
            <h3 className="relative max-w-xl text-2xl font-black tracking-[-.04em]">The product index is waiting for its first listing.</h3>
            <p className="relative mt-3 max-w-xl text-sm leading-6 text-[#314a63]">
              No products have been published to the storefront. An operator can review drafts and publish verified product details in Admin.
            </p>
          </div>
        ) : (
          <div className="grid gap-x-5 gap-y-10 py-8 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} addToBag={add} />
            ))}
          </div>
        )}
      </section>

      <section id="catalogue-notes" className="mt-24 grid gap-8 border-y border-[#152a52]/25 py-8 sm:grid-cols-[.8fr_1.2fr] sm:py-10">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#16468a]">How to read this index</p>
          <h2 className="display-type mt-4 max-w-sm text-4xl uppercase leading-[.92] sm:text-5xl">Only what the listing says.</h2>
        </div>
        <div className="flex flex-col justify-between gap-7 sm:flex-row">
          <p className="max-w-lg text-sm leading-6 text-[#314a63]">
            Product names, categories, prices, availability, and variant details come from published catalogue records. A detail that has not been added to a listing will not be filled in by this page.
          </p>
          <a href="#collection" className="inline-flex shrink-0 items-center gap-2 self-start text-xs font-bold uppercase tracking-[.12em] underline underline-offset-4 hover:text-[#16468a] focus-visible:outline-2 focus-visible:outline-[#16468a]">
            Back to products <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-4 pt-8 text-[10px] font-mono uppercase tracking-[.15em] text-[#314a63]">
        <span>ISK Lenses · Product catalogue</span>
        <span>Browse only · Checkout unavailable</span>
      </footer>
    </div>
  )
}

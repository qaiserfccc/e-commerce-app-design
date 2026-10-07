'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Search, ShoppingBag, X } from 'lucide-react'
import { useProducts, type Product } from '@/lib/hooks/use-storefront-data'

type CartLine = { product: Product; quantity: number }

function cents(value: string) {
  const [whole, fraction = ''] = value.split('.')
  return Number(whole) * 100 + Number(`${fraction}00`.slice(0, 2))
}

function priceLabel(value: string, currency: string) {
  const amount = (Number(value) || 0).toFixed(2)
  return currency === 'USD' ? `$${amount}` : `${currency} ${amount}`
}

function ProductCard({
  product,
  addToBag,
  quantityInBag,
}: {
  product: Product
  addToBag: (product: Product) => void
  quantityInBag: number
}) {
  const unavailable = product.stockQuantity <= quantityInBag
  const artwork = product.heroImageUrl ? 'product-has-image' : `product-${['sand', 'clay', 'ink'][product.name.length % 3]}`

  return (
    <article className="min-w-0">
      <div className={`product-art ${artwork} relative flex aspect-[.9] items-end overflow-hidden rounded-2xl p-4`}>
        {product.heroImageUrl ? (
          <img
            src={product.heroImageUrl}
            alt={product.name}
            className="absolute inset-0 size-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="sr-only">{product.name}</span>
        )}
        <span className="relative z-10 rounded-full bg-white/85 px-3 py-1.5 text-[10px] uppercase tracking-[.16em]">
          {product.category}
        </span>
        <button
          type="button"
          onClick={() => addToBag(product)}
          disabled={unavailable}
          aria-label={unavailable ? `${product.name} is out of stock` : `Add ${product.name} to bag`}
          className="absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full bg-white text-sm font-medium opacity-100 transition hover:bg-[#1c1c1a] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c1c1a] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {unavailable ? '—' : '+'}
        </button>
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium">{product.name}</h3>
          <p className="mt-1 text-xs text-[#6d6c67]">
            {product.stockQuantity > quantityInBag ? `${product.stockQuantity - quantityInBag} available` : 'Out of stock'}
          </p>
        </div>
        <span className="shrink-0 text-sm">{priceLabel(product.price, product.currency)}</span>
      </div>
      {product.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#77756e]">{product.description}</p>}
    </article>
  )
}

export function StorefrontPanel() {
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [cart, setCart] = useState<Record<string, CartLine>>({})
  const deferredSearch = useDeferredValue(search)
  const { products: allProducts, isLoading, isError: allProductsError, error } = useProducts()
  const { products, isLoading: filteredLoading, isError: filteredError, error: filteredRequestError } = useProducts(category || undefined, deferredSearch || undefined)

  const categories = useMemo(() => [...new Set(allProducts.map((product) => product.category))].sort(), [allProducts])
  const cartLines = Object.values(cart)
  const cartCount = cartLines.reduce((sum, line) => sum + line.quantity, 0)
  const subtotalsByCurrency = cartLines.reduce<Record<string, number>>((totals, line) => {
    totals[line.product.currency] = (totals[line.product.currency] ?? 0) + cents(line.product.price) * line.quantity
    return totals
  }, {})

  useEffect(() => {
    if (isLoading || allProductsError) return
    const activeProducts = new Map(allProducts.map((product) => [product.id, product]))
    setCart((current) => {
      let changed = false
      const next: typeof current = {}
      for (const [productId, line] of Object.entries(current)) {
        const currentProduct = activeProducts.get(productId)
        if (!currentProduct || currentProduct.stockQuantity === 0) {
          changed = true
          continue
        }
        const quantity = Math.min(line.quantity, currentProduct.stockQuantity)
        if (quantity !== line.quantity || currentProduct.price !== line.product.price || currentProduct.currency !== line.product.currency) changed = true
        next[productId] = { product: currentProduct, quantity }
      }
      return changed ? next : current
    })
  }, [allProducts, allProductsError, isLoading])

  function addToBag(product: Product) {
    setCart((current) => {
      const existing = current[product.id]?.quantity ?? 0
      if (existing >= product.stockQuantity) return current
      return { ...current, [product.id]: { product, quantity: existing + 1 } }
    })
    setCartOpen(true)
  }

  function setQuantity(productId: string, quantity: number) {
    if (!Number.isSafeInteger(quantity)) return
    setCart((current) => {
      const line = current[productId]
      if (!line) return current
      if (quantity <= 0) {
        const next = { ...current }
        delete next[productId]
        return next
      }
      if (quantity > line.product.stockQuantity) return current
      return { ...current, [productId]: { ...line, quantity } }
    })
  }

  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-24 lg:px-10">
      <nav aria-label="Store navigation" className="flex flex-wrap items-center justify-between gap-4 py-5 text-sm">
        <div className="flex flex-wrap gap-5 text-[#6d6c67]">
          <a className="text-[#1c1c1a] hover:text-[#77756e]" href="#collection">Shop all</a>
          <a href="#collection" onClick={() => setCategory('')}>Collection</a>
          <a href="#about">About the edit</a>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 rounded-full border border-[#1c1c1a]/10 bg-white/70 px-3 py-2.5">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Search products</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search the collection"
              className="w-36 bg-transparent text-xs outline-none placeholder:text-[#77756e] focus-visible:ring-2 focus-visible:ring-[#1c1c1a] sm:w-48"
            />
          </label>
          <button
            type="button"
            onClick={() => setCartOpen((open) => !open)}
            aria-expanded={cartOpen}
            aria-controls="shopping-bag"
            className="flex items-center gap-2 rounded-full border border-[#1c1c1a]/15 bg-white/60 px-4 py-2.5 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c1c1a]"
          >
            <ShoppingBag size={16} /> Bag ({cartCount})
          </button>
        </div>
      </nav>

      {cartOpen && (
        <section id="shopping-bag" aria-label="Shopping bag" className="mb-6 rounded-2xl border border-[#1c1c1a]/10 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-medium">Your bag <span className="text-sm text-[#77756e]">({cartCount})</span></h2>
            <button type="button" onClick={() => setCartOpen(false)} aria-label="Close bag" className="rounded-full p-2 hover:bg-[#f2f1ed] focus-visible:outline-2 focus-visible:outline-[#1c1c1a]">
              <X size={18} />
            </button>
          </div>
          {cartLines.length === 0 ? (
            <p className="mt-4 text-sm text-[#6d6c67]">Your bag is empty. Add an available piece to get started.</p>
          ) : (
            <>
              <ul className="mt-4 divide-y divide-[#1c1c1a]/10">
                {cartLines.map(({ product, quantity }) => (
                  <li key={product.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-medium">{product.name}</p>
                      <p className="mt-1 text-xs text-[#6d6c67]">{priceLabel(product.price, product.currency)} each</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="sr-only" htmlFor={`quantity-${product.id}`}>Quantity for {product.name}</label>
                      <input
                        id={`quantity-${product.id}`}
                        type="number"
                        min="0"
                        max={product.stockQuantity}
                        value={quantity}
                        onChange={(event) => setQuantity(product.id, Number(event.target.value))}
                        className="w-16 rounded-lg border border-[#1c1c1a]/15 px-2 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-[#1c1c1a]"
                      />
                      <span className="min-w-20 text-right text-sm">{priceLabel(((cents(product.price) * quantity) / 100).toFixed(2), product.currency)}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#1c1c1a]/10 pt-4">
                <span className="text-sm font-medium">Subtotal</span>
                <span className="flex flex-wrap justify-end gap-3 text-sm font-medium">
                  {Object.entries(subtotalsByCurrency).map(([currency, subtotal]) => <span key={currency}>{priceLabel((subtotal / 100).toFixed(2), currency)}</span>)}
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-[#6d6c67]">
                Checkout is not available yet because payment processing has not been configured. Your bag stays on this page and is not submitted as an order.
              </p>
            </>
          )}
        </section>
      )}

      <section className="relative grid min-h-[430px] overflow-hidden rounded-[30px] bg-[#e2e7df] lg:grid-cols-[.9fr_1.1fr]">
        <div className="flex flex-col justify-between p-8 sm:p-12 lg:p-16">
          <div>
            <h1 className="max-w-[620px] text-5xl font-medium leading-[.97] tracking-[-.065em] sm:text-7xl">A quieter way to live.</h1>
            <p className="mt-7 max-w-[390px] text-base leading-7 text-[#495249]">Considered forms and everyday objects for slower rituals at home.</p>
            <a href="#collection" className="mt-9 inline-flex items-center gap-3 rounded-full bg-[#1c1c1a] px-6 py-3.5 text-sm font-medium text-white hover:bg-[#353531] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c1c1a]">
              Shop the collection <ArrowRight size={16} />
            </a>
          </div>
          <p className="mt-12 text-xs text-[#596459]">Pieces currently available: {isLoading ? '…' : allProducts.length}</p>
        </div>
        <div aria-hidden="true" className="relative min-h-[260px] overflow-hidden bg-[#d4dbd2]">
          <div className="hero-orb absolute left-[18%] top-[12%] h-[72%] w-[58%] rotate-[-8deg] rounded-[48%_48%_10%_10%]" />
          <div className="absolute left-[28%] top-[22%] h-[36%] w-[38%] rounded-full bg-white/45 shadow-inner" />
          <div className="absolute bottom-[12%] left-[12%] h-8 w-[70%] rounded-full bg-black/15 blur-xl" />
        </div>
      </section>

      <section id="collection" className="pt-12">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-medium tracking-[-.05em]">Shop the collection</h2>
            <p className="mt-2 text-sm text-[#6d6c67]">Live products, availability, descriptions, and prices from the store catalog.</p>
          </div>
          <span className="text-sm text-[#6d6c67]">{isLoading || filteredLoading ? 'Updating…' : `${products.length} ${products.length === 1 ? 'piece' : 'pieces'}`}</span>
        </div>

        <div className="mb-7 flex flex-wrap gap-2" aria-label="Filter by category">
          <button
            type="button"
            onClick={() => setCategory('')}
            aria-pressed={!category}
            className={`rounded-full border px-4 py-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c1c1a] ${!category ? 'border-[#1c1c1a] bg-[#1c1c1a] text-white' : 'border-[#1c1c1a]/10 bg-white/70 hover:bg-white'}`}
          >
            All pieces
          </button>
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
              className={`rounded-full border px-4 py-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c1c1a] ${category === item ? 'border-[#1c1c1a] bg-[#1c1c1a] text-white' : 'border-[#1c1c1a]/10 bg-white/70 hover:bg-white'}`}
            >
              {item}
            </button>
          ))}
        </div>

        {allProductsError || filteredError ? (
          <div role="alert" className="rounded-xl border border-[#9b4a36]/25 bg-[#f8eeeb] px-5 py-4 text-sm text-[#753b2d]">
            {(filteredError ? filteredRequestError : error) instanceof Error
              ? (filteredError ? filteredRequestError : error)?.message
              : 'The collection could not be loaded. Refresh the page to try again.'}
          </div>
        ) : isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Loading products">
            {[0, 1, 2, 3].map((item) => <div key={item} className="aspect-[.9] animate-pulse rounded-2xl bg-[#e8e6e0]" />)}
          </div>
        ) : products.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#1c1c1a]/20 bg-white/50 px-5 py-10 text-center text-sm text-[#6d6c67]">
            No available products match those filters. Try a different category or search term.
          </p>
        ) : (
          <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                addToBag={addToBag}
                quantityInBag={cart[product.id]?.quantity ?? 0}
              />
            ))}
          </div>
        )}
      </section>

      <section id="about" className="mt-24 grid gap-8 rounded-[28px] bg-[#e8e4dc] p-8 sm:p-12 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <h2 className="max-w-lg text-3xl font-medium tracking-[-.05em]">Objects that earn their place.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#5f5d57]">
            Browse the current catalog and find the pieces that fit your everyday. Product information and availability come directly from the store database.
          </p>
        </div>
        <a href="#collection" className="inline-flex items-center gap-2 text-sm underline underline-offset-4">
          Browse all pieces <ArrowRight size={15} />
        </a>
      </section>
    </div>
  )
}

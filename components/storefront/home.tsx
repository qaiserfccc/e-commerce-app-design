'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight, Headphones, ShieldCheck, Truck, Wallet } from 'lucide-react'
import { ProductCard, ProductGridSkeleton } from '@/components/storefront/product-card'
import { useProducts } from '@/lib/hooks/use-storefront-data'
import { useStorefrontCategories } from '@/lib/hooks/use-storefront-categories'
import { categoryHref, categoryTree, isAvailable, titleCase } from '@/lib/store-config'
import { getProductImageSources } from '@/components/storefront/product-image'

const trust = [
  { icon: Truck, title: 'Delivery across Pakistan', body: 'Charge confirmed before dispatch.' },
  { icon: Wallet, title: 'Cash on delivery', body: 'Pay the courier when it arrives.' },
  { icon: ShieldCheck, title: 'Clear product details', body: 'Only listed options are shown.' },
  { icon: Headphones, title: 'Support', body: 'Reach the store about any order.' },
]

const colors = [
  ['Blue', '#3b7dd8'], ['Brown', '#7a4a2a'], ['Gray', '#8a929c'], ['Green', '#3f8a5a'],
  ['Hazel', '#a9783a'], ['Honey', '#d49a3a'], ['Purple', '#7a4ea8'], ['Black', '#1a1a1a'],
]

export function Home() {
  const { products, isLoading, isError } = useProducts()
  const { categories } = useStorefrontCategories()
  const tree = useMemo(() => categoryTree(categories), [categories])
  const roots = (tree.get(0) ?? []).filter((category) => category.sourceProductCount > 0)
  const trending = useMemo(
    () => products.filter((product) => isAvailable(product) && getProductImageSources(product).length).slice(0, 8),
    [products],
  )

  return (
    <main>
      <section className="bg-gradient-to-br from-[#033473] via-[#0a4fa3] to-[#1a6fd0] text-white">
        <div className="mx-auto grid max-w-[1320px] items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.1fr_.9fr] md:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-white/80">Contact lenses in Pakistan</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">Experience the ultimate eye comfort</h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/85">Browse clear and colored lenses from a range of brands and collections, and order with cash on delivery anywhere in Pakistan.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-[#033473] hover:bg-[#dce8f8]">Shop now <ArrowRight size={16} aria-hidden="true" /></Link>
              <Link href="/product-category/new-arrival-contact-lenses-pakistan" className="rounded-full border border-white/70 px-7 py-3.5 text-sm font-semibold hover:bg-white/10">New arrivals</Link>
            </div>
          </div>
          <div aria-hidden="true" className="relative mx-auto aspect-square w-full max-w-sm">
            <div className="absolute inset-0 rounded-full border border-white/30" />
            <div className="absolute inset-[10%] rounded-full border border-white/40" />
            <div className="absolute inset-[22%] rounded-full bg-white/10 shadow-[inset_0_0_40px_rgba(255,255,255,.35)]" />
            <div className="absolute inset-[36%] rounded-full bg-[#033473] ring-[10px] ring-white/80" />
            <div className="absolute inset-[44%] rounded-full bg-black" />
          </div>
        </div>
      </section>

      <section aria-label="Store highlights" className="border-b border-[#033473]/10">
        <ul className="mx-auto grid max-w-[1320px] gap-x-6 gap-y-5 px-4 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {trust.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#eef3fa] text-[#033473]"><Icon size={20} aria-hidden="true" /></span>
              <span><strong className="block text-sm">{title}</strong><span className="text-xs text-[#4a5568]">{body}</span></span>
            </li>
          ))}
        </ul>
      </section>

      {roots.length > 0 && (
        <section className="mx-auto max-w-[1320px] px-4 pt-14 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-[#033473] sm:text-3xl">Shop by category</h2>
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {roots.map((category) => (
              <li key={category.sourceCategoryId}>
                <Link href={categoryHref(category)} className="flex h-full min-h-24 flex-col justify-between rounded-2xl bg-[#eef3fa] p-5 transition hover:bg-[#033473] hover:text-white">
                  <span className="font-bold uppercase tracking-wide">{titleCase(category.name)}</span>
                  <span className="mt-3 text-xs opacity-80">{category.sourceProductCount} products</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mx-auto max-w-[1320px] px-4 pt-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#033473] sm:text-3xl">Top trending</h2>
            <p className="mt-1 text-sm text-[#4a5568]">Lenses currently in stock.</p>
          </div>
          <Link href="/shop" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#033473] hover:underline">View all <ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
        <div className="mt-6">
          {isLoading ? <ProductGridSkeleton /> : isError ? (
            <p role="alert" className="rounded-xl bg-[#fff4f2] px-5 py-4 text-sm text-[#7a1c1c]">Products could not be loaded. Refresh the page to try again.</p>
          ) : trending.length ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
              {trending.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          ) : (
            <p className="rounded-xl bg-[#eef3fa] px-5 py-8 text-center text-sm text-[#4a5568]">No products are available right now.</p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-4 pt-16 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-[#033473] sm:text-3xl">Shop by color</h2>
        <ul className="mt-6 flex flex-wrap gap-3">
          {colors.map(([name, swatch]) => (
            <li key={name}>
              <Link href={`/shop?q=${encodeURIComponent(name)}`} className="inline-flex items-center gap-2.5 rounded-full border border-[#033473]/20 py-2 pl-2 pr-5 text-sm font-semibold hover:border-[#033473] hover:bg-[#eef3fa]">
                <span className="size-7 rounded-full ring-2 ring-white" style={{ backgroundColor: swatch }} aria-hidden="true" /> {name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-[1320px] px-4 pt-16 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-[#033473] sm:text-3xl">Shop by disposability</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-3">
          {['Daily', 'Monthly', 'Yearly'].map((term) => (
            <li key={term}>
              <Link href={`/shop?q=${encodeURIComponent(term)}`} className="flex items-center justify-between rounded-2xl bg-[#eef3fa] px-6 py-5 font-bold uppercase tracking-wide text-[#033473] transition hover:bg-[#033473] hover:text-white">
                {term} lenses <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto mt-16 grid max-w-[1320px] gap-8 px-4 sm:px-6 md:grid-cols-2">
        <div className="rounded-3xl bg-[#eef3fa] p-8 sm:p-10">
          <h2 className="text-2xl font-bold tracking-tight text-[#033473]">About {`ISK Lenses`}</h2>
          <p className="mt-4 leading-7 text-[#4a5568]">ISK Lenses is an online store for contact lenses in Pakistan. Choose between clear and colored lenses across brands and collections, compare the options listed for each product, and place your order in a few steps.</p>
        </div>
        <div className="rounded-3xl bg-[#033473] p-8 text-white sm:p-10">
          <h2 className="text-2xl font-bold tracking-tight">Easy online shopping</h2>
          <p className="mt-4 leading-7 text-white/85">Browse categories, pick your lens option, and check out as a guest or with an account. Pay by cash on delivery; we confirm the delivery charge with you before dispatch.</p>
          <Link href="/shipping-returns" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4">Shipping &amp; returns <ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
      </section>
    </main>
  )
}

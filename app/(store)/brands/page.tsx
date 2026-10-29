import Link from 'next/link'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { BrandIndex } from '@/components/storefront/brand-index'
import { getStorefrontBrands } from '@/lib/data/catalog'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Contact lens brands',
  description: 'Browse the contact lens brands available in the ISK Lenses catalog.',
}

export default async function BrandsPage() {
  const brands = await getStorefrontBrands()

  return (
    <main className="mx-auto max-w-[1320px] px-4 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8">
      <nav aria-label="Breadcrumb" className="text-xs text-[#526b7b]">
        <Link href="/" className="hover:underline">Home</Link> / <span className="font-semibold text-[#15384d]">Brands</span>
      </nav>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-b border-[#cfe2eb] pb-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-[-0.055em] text-[#15384d] sm:text-5xl">Shop by brand</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#526b7b]">Browse every active brand in the catalog and see its current product listings.</p>
        </div>
        <p className="text-sm text-[#526b7b]">{brands.length} {brands.length === 1 ? 'brand' : 'brands'}</p>
      </div>

      <Suspense fallback={<p className="mt-8 text-sm text-[#526b7b]">Loading brands…</p>}>
        <BrandIndex brands={brands} />
      </Suspense>
    </main>
  )
}

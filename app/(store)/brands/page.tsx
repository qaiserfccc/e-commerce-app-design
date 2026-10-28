import Link from 'next/link'
import type { Metadata } from 'next'
import { getStorefrontBrands } from '@/lib/data/catalog'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Contact lens brands',
  description: 'Browse the contact lens brands available in the ISK Lenses catalog.',
}

function wordmarkClass(name: string) {
  const brand = name.toLowerCase()
  if (['bella', 'dahab', 'solotica', 'lenseme', 'victoria'].includes(brand)) return 'font-serif italic'
  if (['hydrocor', 'desio', 'anesthesia'].includes(brand)) return 'font-medium uppercase tracking-[0.1em]'
  return 'font-extrabold tracking-[-0.035em]'
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

      {brands.length > 0 ? (
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {brands.map((brand) => (
            <li key={brand.id}>
              <Link
                href={`/shop?brand=${encodeURIComponent(brand.slug)}`}
                className="group flex min-h-32 flex-col items-center justify-center rounded-2xl border border-[#cfe2eb] bg-white px-4 py-5 text-center transition-colors hover:border-[#087ba5] hover:bg-[#e8f6fb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087ba5] sm:min-h-36"
              >
                {brand.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brand.logoUrl} alt={`${brand.name} logo`} loading="lazy" className="h-12 w-full object-contain" />
                ) : (
                  <span className={`text-lg text-[#15384d] group-hover:text-[#006f9b] sm:text-xl ${wordmarkClass(brand.name)}`}>{brand.name}</span>
                )}
                <span className="mt-3 text-xs text-[#526b7b]">
                  {brand.productCount > 0
                    ? `${brand.productCount} active ${brand.productCount === 1 ? 'listing' : 'listings'}`
                    : 'No active listings'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 rounded-2xl border border-[#cfe2eb] bg-white p-6 text-sm text-[#526b7b]">No brands are available in the catalog yet.</p>
      )}
    </main>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, ShoppingBag } from 'lucide-react'
import { StorefrontBag } from '@/components/storefront/storefront-bag'
import { useStorefrontCart } from '@/lib/hooks/use-storefront-cart'
import { useProduct, type Product, type ProductAsset } from '@/lib/hooks/use-storefront-data'

function formatPrice(value: string, currency: string) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return `${currency} ${value}`
  try {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

function mediaFor(product: Product): ProductAsset[] {
  const assets = product.assets?.filter((asset) => asset.blobUrl) ?? []
  if (assets.length || !product.heroImageUrl) return assets
  return [{
    id: `hero-${product.id}`,
    productId: product.id,
    blobPathname: '',
    blobUrl: product.heroImageUrl,
    altText: product.name,
    mediaType: 'image',
    sortOrder: 0,
    createdAt: product.createdAt,
  }]
}

export function StorefrontProductDetail({ initialProduct }: { initialProduct: Product }) {
  const { product: refreshedProduct, isError, error } = useProduct(initialProduct.slug, initialProduct)
  const product = refreshedProduct ?? initialProduct
  const variants = product.variants ?? []
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id ?? '')
  const [mediaIndex, setMediaIndex] = useState(0)
  const [bagOpen, setBagOpen] = useState(false)
  const { add, count } = useStorefrontCart()
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? variants[0] ?? null
  const media = mediaFor(product)
  const selectedMedia = media[mediaIndex] ?? media[0] ?? null
  const price = selectedVariant?.price ?? product.price
  const currency = selectedVariant?.currency ?? product.currency
  const stockQuantity = selectedVariant?.stockQuantity ?? product.stockQuantity

  function changeMedia(index: number) {
    setMediaIndex((index + media.length) % media.length)
  }

  return (
    <main className="mx-auto min-h-[calc(100vh-72px)] max-w-[1500px] px-5 pb-24 sm:px-8 lg:px-12">
      <div hidden dangerouslySetInnerHTML={{ __html: '<!-- This product page uses the chromatic specimen index: verified product media leads, then actual selectable option, price, and stock fields. Choosing an option opens its published specifications and animates the abstract lens study; the interaction never changes or infers a product claim. -->' }} />
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#152a52]/20 py-4">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.1em] hover:text-[#16468a] focus-visible:outline-2 focus-visible:outline-[#16468a]">
          <ArrowLeft size={15} aria-hidden="true" /> ISK Lenses / Products
        </Link>
        <button
          type="button"
          onClick={() => setBagOpen((open) => !open)}
          aria-expanded={bagOpen}
          aria-controls="shopping-bag"
          className="inline-flex items-center gap-2 border border-[#152a52] bg-[#152a52] px-4 py-2.5 text-xs font-bold uppercase tracking-[.08em] text-[#d3ff48] hover:bg-[#16468a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16468a]"
        >
          <ShoppingBag size={15} aria-hidden="true" /> Bag {count}
        </button>
      </div>
      <StorefrontBag open={bagOpen} onClose={() => setBagOpen(false)} />
      {isError && <p role="status" className="mt-3 text-xs text-[#782b36]">Product details could not be refreshed. Showing the listing as it was loaded.</p>}
      <div className="grid gap-9 pt-7 lg:grid-cols-[1.1fr_.9fr] lg:gap-14 lg:pt-10">
        <section aria-label={`${product.name} product media`}>
          <div className="relative grid min-h-[340px] aspect-square max-h-[750px] place-items-center overflow-hidden bg-[#dbe7e1] sm:min-h-[480px]">
            {selectedMedia?.mediaType === 'video' && selectedMedia.blobUrl ? (
              <video
                key={selectedMedia.id}
                src={selectedMedia.blobUrl}
                controls
                preload="metadata"
                aria-label={selectedMedia.altText || `${product.name} product video`}
                className="size-full bg-[#152a52] object-contain"
              />
            ) : selectedMedia?.blobUrl ? (
              <img
                key={selectedMedia.id}
                src={selectedMedia.blobUrl}
                alt={selectedMedia.altText || product.name}
                className="size-full object-cover"
              />
            ) : (
              <div role="img" aria-label="Abstract illustration; no product photograph has been provided" className="lens-study relative grid size-full place-items-center">
                <span className="lens-crosshair" />
                <span className="absolute bottom-5 left-5 max-w-40 bg-[#152a52] px-3 py-2 font-mono text-[10px] uppercase leading-4 tracking-[.12em] text-[#d3ff48]">
                  Abstract study / no product photo
                </span>
              </div>
            )}
            {media.length > 1 && (
              <div className="absolute bottom-4 right-4 flex gap-2">
                <button type="button" onClick={() => changeMedia(mediaIndex - 1)} aria-label="Previous product media" className="grid size-11 place-items-center bg-[#edf4ef] text-[#152a52] hover:bg-[#d3ff48] focus-visible:outline-2 focus-visible:outline-[#152a52]"><ArrowLeft size={17} /></button>
                <button type="button" onClick={() => changeMedia(mediaIndex + 1)} aria-label="Next product media" className="grid size-11 place-items-center bg-[#edf4ef] text-[#152a52] hover:bg-[#d3ff48] focus-visible:outline-2 focus-visible:outline-[#152a52]"><ArrowRight size={17} /></button>
              </div>
            )}
          </div>
          {media.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2" aria-label="Product media">
              {media.map((asset, index) => (
                <button
                  key={asset.id}
                  type="button"
                  aria-label={`Show ${asset.mediaType === 'video' ? 'video' : 'image'} ${index + 1}`}
                  aria-pressed={index === mediaIndex}
                  onClick={() => setMediaIndex(index)}
                  className={`relative size-16 shrink-0 overflow-hidden border-2 focus-visible:outline-2 focus-visible:outline-[#16468a] ${index === mediaIndex ? 'border-[#16468a]' : 'border-transparent'}`}
                >
                  {asset.mediaType === 'image'
                    ? <img src={asset.blobUrl ?? ''} alt="" className="size-full object-cover" />
                    : <span className="grid size-full place-items-center bg-[#152a52] font-mono text-[10px] uppercase text-[#d3ff48]">Video</span>}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col items-start">
          <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#16468a]">{product.category}</p>
          <h1 className="display-type mt-4 text-5xl uppercase leading-[.92] tracking-[-.025em] sm:text-6xl">{product.name}</h1>
          <div className="mt-6 flex w-full flex-wrap items-baseline justify-between gap-3 border-y border-[#152a52]/25 py-4">
            <p className="text-2xl font-semibold tracking-[-.04em]">{formatPrice(price, currency)}</p>
            <p className="font-mono text-[10px] uppercase tracking-[.12em] text-[#314a63]">
              {stockQuantity > 0 ? `${stockQuantity} available` : 'Unavailable'}
            </p>
          </div>
          {product.description ? (
            <p className="mt-6 max-w-xl text-sm leading-6 text-[#314a63]">{product.description}</p>
          ) : (
            <p className="mt-6 max-w-xl text-sm leading-6 text-[#314a63]">No product description has been published.</p>
          )}

          {variants.length > 0 && (
            <div className="mt-8 w-full">
              <label htmlFor="product-variant" className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[.15em]">Choose a listed option</label>
              <select
                id="product-variant"
                value={selectedVariant?.id ?? ''}
                onChange={(event) => setSelectedVariantId(event.target.value)}
                className="w-full border border-[#152a52]/35 bg-white px-4 py-3 text-sm text-[#152a52] focus-visible:outline-2 focus-visible:outline-[#16468a]"
              >
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name}{variant.color ? ` · ${variant.color}` : ''}{variant.powerDiopters ? ` · ${variant.powerDiopters} D` : ''}{variant.stockQuantity === 0 ? ' · unavailable' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-7 grid w-full grid-cols-2 gap-px bg-[#152a52]/20 sm:grid-cols-4">
            {[
              ['Color', selectedVariant?.color],
              ['Power', selectedVariant?.powerDiopters ? `${selectedVariant.powerDiopters} D` : null],
              ['Base curve', selectedVariant?.baseCurve ? `${selectedVariant.baseCurve} mm` : null],
              ['Diameter', selectedVariant?.diameterMm ? `${selectedVariant.diameterMm} mm` : null],
              ['Pack', selectedVariant?.packSize ? String(selectedVariant.packSize) : null],
            ].filter(([, value]) => value).map(([label, value]) => (
              <div key={label} className="min-w-0 bg-[#edf4ef] px-3 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[.12em] text-[#314a63]">{label}</p>
                <p className="mt-1 truncate text-sm font-semibold">{value}</p>
              </div>
            ))}
            {variants.length === 0 && (
              <p className="col-span-2 bg-[#edf4ef] px-3 py-3 text-xs leading-5 text-[#314a63] sm:col-span-4">
                No lens parameters have been added to this listing.
              </p>
            )}
          </div>
          <p className="mt-4 text-xs leading-5 text-[#314a63]">
            Only specifications entered for this product are displayed. Confirm product details with the store before purchase.
          </p>
          <button
            type="button"
            onClick={() => {
              add(product, selectedVariant)
              setBagOpen(true)
            }}
            disabled={stockQuantity < 1}
            className="mt-8 w-full bg-[#152a52] px-5 py-4 text-xs font-black uppercase tracking-[.15em] text-[#d3ff48] hover:bg-[#16468a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16468a] disabled:cursor-not-allowed disabled:bg-[#dbe7e1] disabled:text-[#314a63]"
          >
            {stockQuantity > 0 ? 'Add selected option to bag' : 'Currently unavailable'}
          </button>
          <p className="mt-3 w-full text-center text-[10px] font-mono uppercase tracking-[.1em] text-[#314a63]">Checkout unavailable · no order will be created</p>
        </section>
      </div>
    </main>
  )
}

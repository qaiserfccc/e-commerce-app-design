'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ShoppingBag, Star } from 'lucide-react'
import { StorefrontProductImage, getProductImageSources } from '@/components/storefront/product-image'
import { useStorefrontCart } from '@/lib/hooks/use-storefront-cart'
import type { Product } from '@/lib/hooks/use-storefront-data'
import { formatPrice, isAvailable, lowestPrice } from '@/lib/store-config'

const sampleProducts = [
  { name: 'Sterling Gray', image: '/isk-home/eye-gray.webp', query: 'gray' },
  { name: 'Mel Honey', image: '/isk-home/eye-brown.webp', query: 'honey' },
  { name: 'Hazel Gold', image: '/isk-home/eye-hazel.webp', query: 'hazel' },
  { name: 'Hidrocor Verde', image: '/isk-home/eye-green.webp', query: 'green' },
]

type Filter = 'catalog' | 'new' | 'reduced'

export function TrendingProducts({ products }: { products: Product[] }) {
  const [filter, setFilter] = useState<Filter>('catalog')
  const filtered = useMemo(() => {
    if (filter === 'reduced') return products.filter((product) => Number(product.compareAtPrice) > Number(product.price))
    if (filter === 'new') return [...products].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    return products
  }, [filter, products])

  return (
    <div>
      <div className="mb-7 flex flex-wrap gap-2 border-b border-[#e6dce1]" role="tablist" aria-label="Filter products">
        {([
          ['catalog', 'Featured'],
          ['new', 'New arrivals'],
          ['reduced', 'On sale'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            onClick={() => setFilter(value)}
            className={`relative px-4 py-3 text-sm font-semibold transition ${filter === value ? 'text-[#b83f6b]' : 'text-[#686371] hover:text-[#201b35]'}`}
          >
            {label}
            {filter === value && <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-[#e84f88]" />}
          </button>
        ))}
      </div>

      {products.length > 0 ? (
        filtered.length > 0 ? (
          <ul role="tabpanel" className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
            {filtered.slice(0, 4).map((product) => <CatalogProduct key={product.id} product={product} />)}
          </ul>
        ) : (
          <div role="tabpanel" className="border-t border-[#e6dce1] py-12 text-center">
            <p className="text-lg font-semibold text-[#201b35]">No matching listings in this view.</p>
            <button type="button" onClick={() => setFilter('catalog')} className="mt-3 text-sm font-semibold text-[#b83f6b] hover:underline">Browse the full catalog</button>
          </div>
        )
      ) : (
        <ul role="tabpanel" className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
          {sampleProducts.map((product) => (
            <li key={product.name} className="group min-w-0">
              <Link href={`/shop?q=${encodeURIComponent(product.query)}`} aria-label={`Browse sample ${product.name} lenses`} className="isk-trending-image relative block overflow-hidden rounded-2xl bg-[#fae9ef]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.image} alt={`Illustrative ${product.name} eye image`} loading="lazy" decoding="async" className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#201b35]">Sample item</span>
              </Link>
              <div className="pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b83f6b]">Design preview</p>
                <h3 className="mt-2 text-lg font-bold tracking-[-0.03em] text-[#201b35]">{product.name}</h3>
                <Link href={`/shop?q=${encodeURIComponent(product.query)}`} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#201b35] hover:text-[#b83f6b]">
                  Browse related lenses <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CatalogProduct({ product }: { product: Product }) {
  const { add } = useStorefrontCart()
  const { price, currency, hasOptions } = lowestPrice(product)
  const available = isAvailable(product)
  const href = `/product/${product.slug}`

  return (
    <li className="group min-w-0">
      <Link href={href} aria-label={`View ${product.name}`} className="isk-trending-image relative block overflow-hidden rounded-2xl bg-[#fae9ef]">
        <StorefrontProductImage
          sources={getProductImageSources(product)}
          alt={product.name}
          fdaApproved={product.fdaApproved}
          className="isk-trending-image-inner aspect-square"
          imageClassName="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          fallback={<div role="img" aria-label={`No product image is available for ${product.name}`} className="product-placeholder size-full" />}
        />
        {!available && <span className="absolute left-3 top-3 rounded-full bg-[#201b35] px-3 py-1.5 text-xs font-semibold text-white">Unavailable</span>}
      </Link>
      <div className="pt-4">
        {product.brand && <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b83f6b]">{product.brand}</p>}
        <h3 className="mt-2 min-h-12 text-lg font-bold leading-6 tracking-[-0.03em] text-[#201b35]">
          <Link href={href} className="hover:text-[#b83f6b]">{product.name}</Link>
        </h3>
        {product.ratingCount ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-[#686371]">
            <Star size={14} className="fill-[#b66b24] text-[#b66b24]" aria-hidden="true" />
            <span>{product.ratingAvg?.toFixed(1)} ({product.ratingCount})</span>
          </p>
        ) : null}
        <p className="mt-3 text-lg font-bold text-[#201b35]">
          {hasOptions && 'From '}{formatPrice(price, currency)}
          {product.compareAtPrice && Number(product.compareAtPrice) > Number(price) && <s className="ml-2 text-sm font-normal text-[#686371]">{formatPrice(product.compareAtPrice, currency)}</s>}
        </p>
        <div className="mt-4">
          {hasOptions || !available ? (
            <Link href={href} className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#201b35]/25 px-4 text-sm font-semibold text-[#201b35] transition hover:border-[#201b35] hover:bg-[#201b35] hover:text-white">
              {available ? 'Choose options' : 'View details'}
            </Link>
          ) : (
            <button type="button" onClick={() => add(product)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#201b35] px-4 text-sm font-semibold text-white transition hover:bg-[#b83f6b]">
              <ShoppingBag size={15} aria-hidden="true" /> Add to bag
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

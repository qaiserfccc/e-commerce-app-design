'use client'

import Link from 'next/link'
import { ArrowUpRight, X } from 'lucide-react'
import { useStorefrontCart } from '@/lib/hooks/use-storefront-cart'

function formatPrice(value: string, currency: string) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return `${currency} ${value}`
  try {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

export function StorefrontBag({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lines, count, setQuantity } = useStorefrontCart()
  if (!open) return null

  const totals = lines.reduce<Record<string, number>>((result, line) => {
    const currency = line.variant?.currency ?? line.product.currency
    const price = line.variant?.price ?? line.product.price
    result[currency] = (result[currency] ?? 0) + Math.round(Number(price) * 100) * line.quantity
    return result
  }, {})

  return (
    <section id="shopping-bag" aria-label="Shopping bag" className="relative mb-7 border-y border-[#152a52]/20 bg-[#e5f0ec] px-5 py-6 sm:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#16468a]">Your selection</p>
          <h2 className="mt-1 text-2xl font-black tracking-[-.05em]">Bag <span className="font-mono text-sm font-medium tracking-normal">({count})</span></h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close bag"
          className="grid size-10 place-items-center border border-[#152a52]/25 text-[#152a52] hover:bg-[#d3ff48] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#152a52]"
        >
          <X size={18} />
        </button>
      </div>
      {lines.length === 0 ? (
        <p className="mt-5 text-sm text-[#314a63]">No lenses selected yet. Explore the catalogue to choose a product.</p>
      ) : (
        <>
          <ul className="mt-5 divide-y divide-[#152a52]/15">
            {lines.map((line) => {
              const price = line.variant?.price ?? line.product.price
              const currency = line.variant?.currency ?? line.product.currency
              return (
                <li key={line.key} className="grid grid-cols-[1fr_auto] gap-4 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <div className="min-w-0">
                    <Link href={`/products/${line.product.slug}`} className="font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-[#152a52]">
                      {line.product.name}
                    </Link>
                    <p className="mt-1 text-xs text-[#314a63]">{line.variant?.name ?? 'Standard listing'}</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-[#314a63]">
                    Qty
                    <input
                      type="number"
                      min="0"
                      max={line.variant?.stockQuantity ?? line.product.stockQuantity}
                      value={line.quantity}
                      onChange={(event) => setQuantity(line.key, Number(event.target.value))}
                      aria-label={`Quantity of ${line.product.name}`}
                      className="w-16 border border-[#152a52]/30 bg-white px-2 py-2 text-sm text-[#152a52] focus-visible:outline-2 focus-visible:outline-[#152a52]"
                    />
                  </label>
                  <p className="col-span-2 text-right font-mono text-xs sm:col-span-1">
                    {formatPrice((Number(price) * line.quantity).toFixed(2), currency)}
                  </p>
                </li>
              )
            })}
          </ul>
          <div className="mt-3 flex flex-wrap justify-end gap-x-6 gap-y-2 border-t border-[#152a52]/20 pt-4 text-sm font-semibold">
            <span>Subtotal</span>
            {Object.entries(totals).map(([currency, total]) => <span key={currency}>{formatPrice((total / 100).toFixed(2), currency)}</span>)}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border border-[#152a52]/20 bg-white/60 px-4 py-3">
            <p className="max-w-xl text-xs leading-5 text-[#314a63]">
              Checkout is not available. This in-page selection is not submitted as an order.
            </p>
            <Link href="/#collection" onClick={onClose} className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-[#152a52] hover:text-[#16468a]">
              Browse catalogue <ArrowUpRight size={14} />
            </Link>
          </div>
        </>
      )}
    </section>
  )
}

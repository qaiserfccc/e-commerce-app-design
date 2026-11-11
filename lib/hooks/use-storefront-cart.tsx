'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Product, ProductVariant } from '@/lib/hooks/use-storefront-data'
import { isValidLensSelection, priceWithPowerSurcharge } from '@/lib/power-lens-options'
import { trackGrowthEvent } from '@/components/analytics/marketing-analytics'

export type CartLine = {
  product: Product
  variant: ProductVariant | null
  quantity: number
  leftPowerRange: string | null
  rightPowerRange: string | null
  lensChoice: 'plain' | 'power' | null
}

export function getCartLinePrice(line: CartLine) {
  const basePrice = line.variant?.price ?? line.product.price
  return {
    price: priceWithPowerSurcharge(
      basePrice,
      line.product.availablePowerOptions,
      line.leftPowerRange,
      line.rightPowerRange,
    ) ?? basePrice,
    currency: line.variant?.currency ?? line.product.currency,
  }
}

type PowerSelection = { choice: 'plain' } | { choice: 'power'; left: string; right: string } | null

type StorefrontCartValue = {
  lines: Array<CartLine & { key: string }>
  count: number
  add: (product: Product, variant?: ProductVariant | null, powerSelection?: PowerSelection) => void
  setQuantity: (key: string, quantity: number) => void
  clear: () => void
  syncProducts: (products: Product[]) => void
  keyFor: (product: Product, variant?: ProductVariant | null, powerSelection?: PowerSelection) => string
}

const CartContext = createContext<StorefrontCartValue | null>(null)

export function StorefrontCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Record<string, CartLine>>({})
  const itemsRef = useRef(items)
  const updateItems = useCallback((update: (current: Record<string, CartLine>) => Record<string, CartLine>) => {
    const current = itemsRef.current
    const next = update(current)
    if (next === current) return false
    itemsRef.current = next
    setItems(next)
    return true
  }, [])
  const keyFor = useCallback((product: Product, variant?: ProductVariant | null, powerSelection?: PowerSelection) =>
    `${product.id}:${variant?.id ?? 'standard'}:${powerSelection?.choice === 'plain' ? 'plain' : powerSelection?.left ?? ''}:${powerSelection?.choice === 'power' ? powerSelection.right : ''}`, [])

  const add = useCallback((product: Product, variant: ProductVariant | null = null, powerSelection: PowerSelection = null) => {
    const key = keyFor(product, variant, powerSelection)
    const available = variant?.stockQuantity ?? product.stockQuantity
    const quantity = itemsRef.current[key]?.quantity ?? 0
    if (quantity >= available) return
    const added = updateItems((current) => {
      const currentQuantity = current[key]?.quantity ?? 0
      if (currentQuantity >= available) return current
      return {
        ...current,
        [key]: {
          product,
          variant,
          quantity: currentQuantity + 1,
          leftPowerRange: powerSelection?.choice === 'power' ? powerSelection.left : null,
          rightPowerRange: powerSelection?.choice === 'power' ? powerSelection.right : null,
          lensChoice: powerSelection?.choice ?? null,
        },
      }
    })
    if (added) trackGrowthEvent('add_to_cart', { productId: product.id })
  }, [keyFor, updateItems])

  const setQuantity = useCallback((key: string, quantity: number) => {
    if (!Number.isSafeInteger(quantity)) return
    updateItems((current) => {
      const line = current[key]
      if (!line) return current
      if (quantity <= 0) {
        const next = { ...current }
        delete next[key]
        return next
      }
      const available = line.variant?.stockQuantity ?? line.product.stockQuantity
      if (quantity > available) return current
      return { ...current, [key]: { ...line, quantity } }
    })
  }, [updateItems])

  const syncProducts = useCallback((products: Product[]) => {
    const active = new Map(products.map((product) => [product.id, product]))
    updateItems((current) => {
      let changed = false
      const next: typeof current = {}
      for (const [key, line] of Object.entries(current)) {
        const product = active.get(line.product.id)
        const variant = product?.variants?.find((item) => item.id === line.variant?.id) ?? null
        const available = line.variant
          ? variant?.stockQuantity ?? 0
          : product?.variants?.length ? 0 : product?.stockQuantity ?? 0
        if (!product || available === 0) {
          changed = true
          continue
        }
        const powerRanges = product.availablePowerRanges ?? []
        const validPowerSelection = isValidLensSelection(powerRanges, line.lensChoice, line.leftPowerRange, line.rightPowerRange)
        if (!validPowerSelection) {
          changed = true
          continue
        }
        const quantity = Math.min(line.quantity, available)
        changed ||= quantity !== line.quantity || line.product !== product || line.variant !== variant
        next[key] = {
          product,
          variant,
          quantity,
          leftPowerRange: line.leftPowerRange,
          rightPowerRange: line.rightPowerRange,
          lensChoice: line.lensChoice,
        }
      }
      return changed ? next : current
    })
  }, [updateItems])
  const clear = useCallback(() => { updateItems(() => ({})) }, [updateItems])

  const value = useMemo(() => {
    const lines = Object.entries(items).map(([key, line]) => ({ ...line, key }))
    return {
      lines,
      count: lines.reduce((total, line) => total + line.quantity, 0),
      add,
      setQuantity,
      clear,
      syncProducts,
      keyFor,
    }
  }, [items, add, setQuantity, clear, syncProducts, keyFor])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useStorefrontCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('Storefront cart provider is missing.')
  return context
}

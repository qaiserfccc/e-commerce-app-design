'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Product, ProductVariant } from '@/lib/hooks/use-storefront-data'

export type CartLine = {
  product: Product
  variant: ProductVariant | null
  quantity: number
}

type StorefrontCartValue = {
  lines: Array<CartLine & { key: string }>
  count: number
  add: (product: Product, variant?: ProductVariant | null) => void
  setQuantity: (key: string, quantity: number) => void
  syncProducts: (products: Product[]) => void
  keyFor: (product: Product, variant?: ProductVariant | null) => string
}

const CartContext = createContext<StorefrontCartValue | null>(null)

export function StorefrontCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Record<string, CartLine>>({})
  const keyFor = useCallback((product: Product, variant?: ProductVariant | null) => `${product.id}:${variant?.id ?? 'standard'}`, [])

  const add = useCallback((product: Product, variant: ProductVariant | null = null) => {
    const key = keyFor(product, variant)
    const available = variant?.stockQuantity ?? product.stockQuantity
    setItems((current) => {
      const quantity = current[key]?.quantity ?? 0
      if (quantity >= available) return current
      return { ...current, [key]: { product, variant, quantity: quantity + 1 } }
    })
  }, [keyFor])

  const setQuantity = useCallback((key: string, quantity: number) => {
    if (!Number.isSafeInteger(quantity)) return
    setItems((current) => {
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
  }, [])

  const syncProducts = useCallback((products: Product[]) => {
    const active = new Map(products.map((product) => [product.id, product]))
    setItems((current) => {
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
        const quantity = Math.min(line.quantity, available)
        changed ||= quantity !== line.quantity || line.product !== product || line.variant !== variant
        next[key] = { product, variant, quantity }
      }
      return changed ? next : current
    })
  }, [])

  const value = useMemo(() => {
    const lines = Object.entries(items).map(([key, line]) => ({ ...line, key }))
    return {
      lines,
      count: lines.reduce((total, line) => total + line.quantity, 0),
      add,
      setQuantity,
      syncProducts,
      keyFor,
    }
  }, [items, add, setQuantity, syncProducts, keyFor])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useStorefrontCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('Storefront cart provider is missing.')
  return context
}

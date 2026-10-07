'use client'

import useSWR from 'swr'

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: 'no-store' })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error || 'Unable to load products.')
  return body
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  category: string
  price: string
  currency: string
  status: string
  stockQuantity: number
  heroImageUrl: string | null
  createdAt: string
  updatedAt: string
  assets?: ProductAsset[]
}

export interface ProductAsset {
  id: string
  productId: string
  blobPathname: string
  blobUrl: string | null
  altText: string | null
  sortOrder: number
  createdAt: string
}

interface ProductsResponse {
  data: Product[]
  timestamp: string
}

/**
 * Hook for fetching active products with real-time updates via SWR
 * Revalidates every 60 seconds for fresh inventory
 */
export function useProducts(category?: string, search?: string) {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (search?.trim()) params.set('q', search.trim())
  const suffix = params.size ? `?${params.toString()}` : ''
  const url = `/api/products${suffix}`

  const { data, error, isLoading, mutate } = useSWR<ProductsResponse>(url, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 60000,
    focusThrottleInterval: 300000,
    refreshInterval: 60000, // Revalidate every 60 seconds
  })

  return {
    products: data?.data || [],
    isLoading,
    isError: !!error,
    error,
    mutate, // Call this to trigger manual refresh
  }
}

/**
 * Hook for fetching a single product by slug
 */
export function useProduct(slug: string) {
  const { data, error, isLoading, mutate } = useSWR<{ data: Product }>(slug ? `/api/products/${encodeURIComponent(slug)}` : null, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 60000,
    refreshInterval: 120000, // Revalidate every 2 minutes for single product
  })

  return {
    product: data?.data || null,
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

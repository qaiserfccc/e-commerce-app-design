'use client'

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Product {
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
  assets?: any[]
}

interface ProductsResponse {
  data: Product[]
  timestamp: string
}

/**
 * Hook for fetching active products with real-time updates via SWR
 * Revalidates every 60 seconds for fresh inventory
 */
export function useProducts(category?: string) {
  const url = category ? `/api/products?category=${encodeURIComponent(category)}` : '/api/products'

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
  const { data, error, isLoading, mutate } = useSWR<{ data: Product }>(`/api/products/${slug}`, fetcher, {
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

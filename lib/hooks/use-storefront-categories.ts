'use client'

import useSWR from 'swr'
import type { CategoryNode } from '@/lib/catalog-types'

export type ProductCategory = CategoryNode

async function fetchCategories(url: string) {
  const response = await fetch(url, { cache: 'no-store' })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error || 'Unable to load product categories.')
  return body as { data: ProductCategory[] }
}

export function useStorefrontCategories() {
  const { data, error, isLoading, mutate } = useSWR<{ data: ProductCategory[] }>(
    '/api/product-categories',
    fetchCategories,
    { revalidateOnFocus: true, revalidateOnReconnect: true, dedupingInterval: 60_000 },
  )
  return { categories: data?.data ?? [], isLoading, isError: Boolean(error), error, mutate }
}

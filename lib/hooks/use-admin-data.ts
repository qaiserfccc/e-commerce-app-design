'use client'

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface DashboardMetrics {
  orders: {
    totalOrders: number
    totalRevenue: string
    avgOrderValue: string
  }
  customers: {
    totalCustomers: number
  }
}

interface MetricsResponse {
  data: DashboardMetrics
  timestamp: string
}

/**
 * Hook for fetching admin dashboard metrics with real-time updates
 * Revalidates every 30 seconds for fresh data
 */
export function useAdminMetrics() {
  const { data, error, isLoading, mutate } = useSWR<MetricsResponse>('/api/admin/metrics', fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 30000,
    focusThrottleInterval: 60000,
    refreshInterval: 30000, // Revalidate every 30 seconds
  })

  return {
    metrics: data?.data,
    isLoading,
    isError: !!error,
    error,
    timestamp: data?.timestamp,
    mutate, // Call this to trigger manual refresh
  }
}

/**
 * Hook for manually triggering data refetch across admin panels
 * Use this after mutations (create, update, delete)
 */
export function useAdminRefresh() {
  const { mutate } = useSWR<MetricsResponse>('/api/admin/metrics', fetcher)

  return {
    refresh: () => mutate(),
  }
}

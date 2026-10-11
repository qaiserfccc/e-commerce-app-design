'use client'

import { useState, type ReactNode } from 'react'
import type { Product } from '@/lib/hooks/use-storefront-data'

function trustedBlobUrl(blobUrl: string | null | undefined) {
  if (!blobUrl) return null
  try {
    const url = new URL(blobUrl)
    if (
      url.protocol === 'https:' &&
      (url.hostname.endsWith('.public.blob.vercel-storage.com') ||
        url.hostname.endsWith('.blob.vercel-storage.com'))
    ) {
      return url.toString()
    }
  } catch {
    return null
  }
  return null
}

export function getProductImageSources(product: Pick<Product, 'heroImageUrl' | 'assets'>) {
  return [...new Set([
    trustedBlobUrl(product.heroImageUrl),
    ...(product.assets ?? [])
      .filter((asset) => asset.mediaType === 'image')
      .map((asset) => trustedBlobUrl(asset.blobUrl)),
  ].filter((source): source is string => Boolean(source)))]
}

export function StorefrontProductImage({
  sources,
  alt,
  className,
  imageClassName,
  fallback,
  loading = 'lazy',
  children,
}: {
  sources: string[]
  alt: string
  className: string
  imageClassName: string
  fallback: ReactNode
  loading?: 'eager' | 'lazy'
  children?: ReactNode
}) {
  const [failedSource, setFailedSource] = useState<{ key: string; index: number } | null>(null)
  const sourceKey = sources.join('\u0000')
  const sourceIndex = failedSource?.key === sourceKey ? failedSource.index : 0
  const source = sources[sourceIndex]

  return (
    <div className={className}>
      {source ? (
        <img
          key={source}
          src={source}
          alt={alt}
          loading={loading}
          decoding="async"
          className={imageClassName}
          onError={() => setFailedSource({ key: sourceKey, index: sourceIndex + 1 })}
        />
      ) : fallback}
      {children}
    </div>
  )
}

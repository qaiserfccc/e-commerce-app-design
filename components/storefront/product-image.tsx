'use client'

import { useState, type ReactNode } from 'react'
import type { Product } from '@/lib/hooks/use-storefront-data'

function trustedSourceImageUrl(sourceImage: string | null | undefined) {
  if (!sourceImage) return null
  try {
    const url = new URL(sourceImage)
    if (
      url.protocol === 'https:' &&
      ['isklenses.com', 'www.isklenses.com'].includes(url.hostname) &&
      url.pathname.startsWith('/wp-content/uploads/')
    ) {
      return url.toString()
    }
  } catch {
    return null
  }
  return null
}

export function getProductImageSources(product: Pick<Product, 'heroImageUrl' | 'sourceImageUrl' | 'sourceImageUrls' | 'assets'>) {
  return [...new Set([
    product.heroImageUrl,
    ...(product.assets ?? [])
      .filter((asset) => asset.mediaType === 'image')
      .map((asset) => asset.blobUrl),
    trustedSourceImageUrl(product.sourceImageUrl),
    ...(product.sourceImageUrls ?? []).map(trustedSourceImageUrl),
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

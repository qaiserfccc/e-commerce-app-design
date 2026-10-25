'use client'

import { useState, type ReactNode } from 'react'
import { getProductImageSources } from '@/lib/storefront/product-image-sources'

export { getProductImageSources }

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

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
  fdaApproved = false,
}: {
  sources: string[]
  alt: string
  className: string
  imageClassName: string
  fallback: ReactNode
  loading?: 'eager' | 'lazy'
  children?: ReactNode
  fdaApproved?: boolean
}) {
  const [failedSource, setFailedSource] = useState<{ key: string; index: number } | null>(null)
  const sourceKey = sources.join('\u0000')
  const sourceIndex = failedSource?.key === sourceKey ? failedSource.index : 0
  const source = sources[sourceIndex]

  return (
    <div className={`${className} relative`}>
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
      {fdaApproved && (
        <span className="absolute bottom-2 left-2 z-10 inline-flex items-center rounded-full border border-white/70 bg-[#006f9b] px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-md">
          FDA Approved
        </span>
      )}
      {children}
    </div>
  )
}

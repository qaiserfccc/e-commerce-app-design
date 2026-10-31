'use client'

import { useState, type ReactNode } from 'react'

export function StorefrontFallbackImage({
  sources,
  alt,
  className,
  imageClassName,
  fallback,
}: {
  sources: Array<string | null | undefined>
  alt: string
  className?: string
  imageClassName?: string
  fallback?: ReactNode
}) {
  const validSources = sources.filter((source): source is string => Boolean(source?.trim()))
  const sourceKey = validSources.join('\u0000')
  const [failed, setFailed] = useState<{ sourceKey: string; index: number }>({ sourceKey: '', index: 0 })
  const index = failed.sourceKey === sourceKey ? failed.index : 0
  const source = validSources[index]

  if (!source) return fallback ?? null

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={source}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`${className ?? ''} ${imageClassName ?? ''}`.trim()}
      onError={() => setFailed({ sourceKey, index: index + 1 })}
    />
  )
}

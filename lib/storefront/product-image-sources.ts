type ProductImageData = {
  heroImageUrl: string | null
  assets?: {
    mediaType: 'image' | 'video'
    blobUrl: string | null
  }[]
}

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

export function getProductImageSources(product: ProductImageData) {
  return [...new Set([
    trustedBlobUrl(product.heroImageUrl),
    ...(product.assets ?? [])
      .filter((asset) => asset.mediaType === 'image')
      .map((asset) => trustedBlobUrl(asset.blobUrl)),
  ].filter((source): source is string => Boolean(source)))]
}

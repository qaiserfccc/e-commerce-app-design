const SOURCE_ORIGIN = 'https://peachpuff-dinosaur-871494.hostingersite.com'
const PRODUCTION_ORIGIN = 'https://isklenses.com'
const SOURCE_HOST = new URL(SOURCE_ORIGIN).hostname
const PRODUCTION_HOST = new URL(PRODUCTION_ORIGIN).host

function isSourceUpload(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' &&
      url.origin === SOURCE_ORIGIN &&
      url.pathname.startsWith('/wp-content/uploads/')
  } catch {
    return false
  }
}

export function collectHostingerSeoImageUrls(value) {
  const urls = new Set()
  const visit = (item) => {
    if (typeof item === 'string') {
      if (isSourceUpload(item)) urls.add(new URL(item).toString())
      return
    }
    if (Array.isArray(item)) {
      item.forEach(visit)
      return
    }
    if (item && typeof item === 'object') Object.values(item).forEach(visit)
  }
  visit(value)
  return [...urls]
}

function remapSourceUrl(value, productSlug, imageUrls) {
  const url = new URL(value)
  if (url.hostname !== SOURCE_HOST) return value

  if (url.pathname.startsWith('/wp-content/uploads/')) {
    const mapped = imageUrls.get(url.toString())
    if (!mapped) throw new Error(`SEO image was not copied into first-party media: ${url.pathname}`)
    return mapped
  }

  if (/^\/product\/[^/]+\/?$/.test(url.pathname)) {
    url.pathname = `/product/${productSlug}`
  }
  url.protocol = 'https:'
  url.host = PRODUCTION_HOST
  return url.toString()
}

function remapSeoValue(value, productSlug, imageUrls) {
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value)) {
      try {
        new URL(value)
      } catch {
        return value.replaceAll('peachpuff-dinosaur-871494.hostingersite.com', 'ISK Lenses')
      }
      return remapSourceUrl(value, productSlug, imageUrls)
    }
    return value.replaceAll('peachpuff-dinosaur-871494.hostingersite.com', 'ISK Lenses')
  }
  if (Array.isArray(value)) return value.map((item) => remapSeoValue(item, productSlug, imageUrls))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, remapSeoValue(item, productSlug, imageUrls)]),
    )
  }
  return value
}

export function normalizeHostingerSeo(aioseo, productSlug, imageUrls) {
  if (!aioseo || typeof aioseo !== 'object' || Array.isArray(aioseo)) {
    throw new Error('The Hostinger product does not include AIOSEO metadata.')
  }
  const fields = remapSeoValue(aioseo, productSlug, imageUrls)
  const canonicalUrl = `${PRODUCTION_ORIGIN}/product/${productSlug}`
  fields.canonical_url = canonicalUrl
  if (fields['og:url'] !== undefined) fields['og:url'] = canonicalUrl
  const title = typeof fields.title === 'string' ? fields.title.trim() : ''
  const description = typeof fields.description === 'string' ? fields.description.trim() : ''
  if (!title) throw new Error('The Hostinger product is missing its SEO title.')
  return { canonicalUrl, title, description, fields }
}

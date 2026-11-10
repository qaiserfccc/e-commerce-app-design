import type { MetadataRoute } from 'next'
import { getCategories, getSitemapProducts } from '@/lib/data/catalog'

const origin = 'https://isklenses.com'
const staticPaths = [
  '/',
  '/shop',
  '/products',
  '/brands',
  '/faq',
  '/shipping-returns',
  '/contact-us',
  '/blogs',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([getSitemapProducts(), getCategories()])
  return [
    ...staticPaths.map((path) => ({ url: new URL(path, origin).toString() })),
    ...categories.map((category) => ({
      url: new URL(`/product-category/${category.path}`, origin).toString(),
    })),
    ...products.map((product) => ({
      url: new URL(`/product/${product.slug}`, origin).toString(),
      lastModified: product.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      ...(product.heroImageUrl
        ? { images: [new URL(product.heroImageUrl, origin).toString()] }
        : {}),
    })),
  ]
}

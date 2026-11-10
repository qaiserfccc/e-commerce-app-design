import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/api/media/'],
      disallow: ['/admin/', '/api/', '/cart/', '/checkout/', '/my-account/', '/orders/'],
    },
    sitemap: 'https://isklenses.com/sitemap.xml',
    host: 'https://isklenses.com',
  }
}

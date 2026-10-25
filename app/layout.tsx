import { Analytics } from '@vercel/analytics/next'
import { Outfit } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import { StorefrontCartProvider } from '@/lib/hooks/use-storefront-cart'
import './globals.css'

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'ISK Lenses — Contact lenses in Pakistan', template: '%s — ISK Lenses' },
  description: 'Shop contact lenses online in Pakistan. Browse brands, colors and collections and order with cash on delivery.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#201b35',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="antialiased">
        <div hidden aria-hidden="true" dangerouslySetInnerHTML={{ __html: '<!--\nTHESIS: ISK Lenses is an editorial lens catalog, not a generic blue storefront.\nOWN-WORLD: Outfit typography, ink navy, rose pink, warm porcelain, pill controls, and open product imagery.\nSTORY: Visitors browse the real catalog, inspect product details, add items to the bag, and check out without unsupported promises.\nFIRST VIEWPORT: Navy announcement ribbon, porcelain logo/search row, category navigation, then a split editorial hero with copy left and catalog imagery right.\nFORM: User-pinned reference-led beauty-commerce layout, adapted across shopper and admin surfaces; no generated seed.\n-->' }} />
        <StorefrontCartProvider>{children}</StorefrontCartProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

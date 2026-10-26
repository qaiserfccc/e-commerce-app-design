import { Analytics } from '@vercel/analytics/next'
import { Outfit } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import { AppNotifications } from '@/components/ui/app-notifications'
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
  themeColor: '#087ba5',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="antialiased">
        <div hidden aria-hidden="true" dangerouslySetInnerHTML={{ __html: '<!--\nTHESIS: ISK Lenses makes real lens photography and shade comparisons the focus, not decorative color claims.\nOWN-WORLD: Clear sky-blue fields, deep ocean-blue actions, cool white surfaces, and untouched product colors.\nSTORY: Shoppers browse the catalog, compare genuine photos and details, add items to the bag, and continue through the existing checkout.\nFIRST VIEWPORT: Blue announcement strip, white logo/search row, category links, and the existing full-height image-led hero with its primary action left.\nFORM: Preserve the current responsive storefront and nine-panel snap homepage; this is a palette change guided by isklenses.com, not a layout replacement.\n-->' }} />
        <AppNotifications>
          <StorefrontCartProvider>{children}</StorefrontCartProvider>
        </AppNotifications>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

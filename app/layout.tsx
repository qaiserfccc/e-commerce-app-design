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
  themeColor: '#033473',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="antialiased">
        <StorefrontCartProvider>{children}</StorefrontCartProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

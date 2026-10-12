import { StoreFooter } from '@/components/storefront/shell/store-footer'
import { StoreHeader } from '@/components/storefront/shell/store-header'

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="storefront-sky min-h-screen bg-white text-[#0a0a0a]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
      <StoreHeader />
      <div id="main">{children}</div>
      <StoreFooter />
    </div>
  )
}

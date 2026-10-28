import { getSiteChrome } from '@/lib/data/site-content'
import { RuntimeErrorNotice } from '@/components/ui/app-notifications'
import { StoreFooter } from '@/components/storefront/shell/store-footer'
import { StoreFooterRoute } from '@/components/storefront/shell/store-footer-route'
import { StoreHeader } from '@/components/storefront/shell/store-header'
import { getStorefrontBrands } from '@/lib/data/catalog'

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [chrome, brands] = await Promise.all([getSiteChrome(), getStorefrontBrands()])
  const linkedBrands = brands.filter((brand) => brand.productCount > 0)
  return (
    <div className="storefront-sky min-h-screen bg-[#f6fbff] text-[#080b10]">
      <RuntimeErrorNotice message={chrome.loadError} />
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
      <StoreHeader chrome={chrome} />
      <div id="main">{children}</div>
      <StoreFooterRoute><StoreFooter chrome={chrome} brands={linkedBrands} /></StoreFooterRoute>
    </div>
  )
}

import { Home } from '@/components/storefront/home'
import { getSiteChrome } from '@/lib/data/site-content'

export default async function Page() {
  const chrome = await getSiteChrome()
  return <Home chrome={chrome} />
}

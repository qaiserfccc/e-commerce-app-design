import type { Metadata } from 'next'
import { AccountPage } from '@/components/storefront/account-page'

export const metadata: Metadata = { title: 'My account' }

export default function Page() {
  return <AccountPage />
}

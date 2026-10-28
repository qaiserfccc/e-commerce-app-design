import type { Metadata } from 'next'
import { Checkout } from '@/components/storefront/checkout'
import { getStorefrontDeliveryRules } from '@/lib/data/delivery'

export const metadata: Metadata = {
  title: 'Checkout — ISK Lenses',
  description: 'Review your order details and place a cash-on-delivery order.',
}
export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
  const deliveryRules = await getStorefrontDeliveryRules()
  return <Checkout deliveryRules={deliveryRules} />
}

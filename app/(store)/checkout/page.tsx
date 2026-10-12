import type { Metadata } from 'next'
import { Checkout } from '@/components/storefront/checkout'

export const metadata: Metadata = {
  title: 'Checkout — ISK Lenses',
  description: 'Review your order details and place a cash-on-delivery order.',
}

export default function CheckoutPage() {
  return <Checkout />
}

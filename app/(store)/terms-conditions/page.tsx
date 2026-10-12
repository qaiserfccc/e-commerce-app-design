import type { Metadata } from 'next'
import Link from 'next/link'
import { ContentPage } from '@/components/storefront/content-page'

export const metadata: Metadata = { title: 'Terms & conditions' }

export default function Page() {
  return (
    <ContentPage title="Terms & conditions" intro="The basic terms for using this store and placing orders.">
      <section>
        <h2>Orders</h2>
        <p>Placing an order is a request to buy. An order is pending until the store confirms it with you. Availability and prices are shown as published and are checked again when you submit your order.</p>
      </section>
      <section>
        <h2>Payment and delivery</h2>
        <p>Payment is cash on delivery. Delivery charges are confirmed before dispatch. See <Link href="/shipping-returns">Shipping &amp; returns</Link>.</p>
      </section>
      <section>
        <h2>Health and safety</h2>
        <p>Contact lenses are medical devices. Use them as directed by your eye-care professional, and seek advice if you experience discomfort. Product information on this site is not medical advice.</p>
      </section>
      <section>
        <h2>Accounts</h2>
        <p>You are responsible for keeping your account password confidential.</p>
      </section>
    </ContentPage>
  )
}

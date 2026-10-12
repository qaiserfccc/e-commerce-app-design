import type { Metadata } from 'next'
import Link from 'next/link'
import { ContentPage } from '@/components/storefront/content-page'

export const metadata: Metadata = { title: 'Shipping & returns' }

export default function Page() {
  return (
    <ContentPage title="Shipping & returns" intro="How delivery and payment work at ISK Lenses.">
      <section>
        <h2>Delivery</h2>
        <p>We deliver to addresses across Pakistan. Orders are recorded as pending until the store confirms them with you.</p>
      </section>
      <section>
        <h2>Delivery charge</h2>
        <p>The delivery charge is not included in the total shown at checkout. The store confirms the charge and the final payable amount with you before dispatch.</p>
      </section>
      <section>
        <h2>Payment</h2>
        <p>Payment is by cash on delivery only. No card or online payment is collected on this site.</p>
      </section>
      <section>
        <h2>Damaged or incorrect items</h2>
        <p>Check your parcel when it arrives. If an item is damaged or is not what you ordered, <Link href="/contact-us">contact us</Link> promptly with your order reference. Specific return terms are confirmed by the store when you get in touch.</p>
      </section>
    </ContentPage>
  )
}

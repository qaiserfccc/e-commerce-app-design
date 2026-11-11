import type { Metadata } from 'next'
import Link from 'next/link'
import { ContentPage } from '@/components/storefront/content-page'

export const metadata: Metadata = { title: 'Privacy policy' }

export default function Page() {
  return (
    <ContentPage title="Privacy policy" intro="What information this site collects and how it is used.">
      <section>
        <h2>Information we collect</h2>
        <p>When you place an order we collect your name, phone number, email address and delivery address. If you create an account we also store your email address and a hashed password.</p>
      </section>
      <section>
        <h2>How it is used</h2>
        <p>We use this information to confirm, prepare and deliver your order and to contact you about it. We do not collect card or other online payment details.</p>
      </section>
      <section>
        <h2>Cookies</h2>
        <p>This site uses a secure session cookie to keep you signed in to your account. Your shopping cart is kept in your browser while the page is open and is not stored on our servers until you place an order.</p>
        <p>Optional analytics and marketing tags (such as Meta Pixel, Google Analytics, Google Tag Manager, Google Ads, or TikTok Pixel) load only after you choose “Allow analytics.” If you reject optional analytics, those tags and first-party browsing events remain off. You can reopen Privacy settings at any time using the button at the bottom of the site. When enabled, the site records limited event names, page paths, and an in-session random identifier to measure the storefront journey; it does not send order contact or address details to these tags. First-party growth events are removed in bounded batches after 90 days.</p>
        <p>You may also block third-party scripts in your browser. Provider-reported numbers can differ from completed orders; the store's order records remain the source of truth.</p>
      </section>
      <section>
        <h2>Questions</h2>
        <p>To ask about your information, <Link href="/contact-us">contact us</Link>.</p>
      </section>
    </ContentPage>
  )
}

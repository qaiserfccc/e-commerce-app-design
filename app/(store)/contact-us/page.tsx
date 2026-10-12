import type { Metadata } from 'next'
import { ContentPage } from '@/components/storefront/content-page'
import { storeContact } from '@/lib/store-config'

export const metadata: Metadata = { title: 'Contact us' }

export default function Page() {
  const hasContact = Boolean(storeContact.phone || storeContact.email || storeContact.whatsapp)
  return (
    <ContentPage title="Contact us" intro="Questions about a product or an order? Get in touch with the store.">
      {hasContact ? (
        <ul className="!list-none !pl-0 grid gap-4 sm:grid-cols-2">
          {storeContact.phone && <li className="rounded-2xl bg-[#eef3fa] p-6"><h2>Call</h2><a href={`tel:${storeContact.phone.replace(/[^\d+]/g, '')}`}>{storeContact.phone}</a></li>}
          {storeContact.whatsapp && <li className="rounded-2xl bg-[#eef3fa] p-6"><h2>WhatsApp</h2><a href={`https://wa.me/${storeContact.whatsapp}`} target="_blank" rel="noopener noreferrer">Start a chat</a></li>}
          {storeContact.email && <li className="rounded-2xl bg-[#eef3fa] p-6"><h2>Email</h2><a href={`mailto:${storeContact.email}`}>{storeContact.email}</a></li>}
        </ul>
      ) : (
        <p className="rounded-2xl bg-[#eef3fa] p-6">Store contact details have not been published yet. Please check back soon.</p>
      )}
      <section>
        <h2>When you contact us</h2>
        <p>Please include your order reference (shown on the confirmation page) and the phone number used at checkout so we can find your order quickly.</p>
      </section>
    </ContentPage>
  )
}

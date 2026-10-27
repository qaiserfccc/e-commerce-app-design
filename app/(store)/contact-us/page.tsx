import type { Metadata } from 'next'
import { ContentPage } from '@/components/storefront/content-page'
import { getSiteChrome } from '@/lib/data/site-content'

export const metadata: Metadata = { title: 'Contact us' }

export default async function Page() {
  const { contact } = await getSiteChrome()
  const hasContact = Boolean(contact.phone || contact.email || contact.whatsapp || contact.address || contact.facebook || contact.instagram)
  return (
    <ContentPage title="Contact us" intro="Questions about a product or an order? Get in touch with the store.">
      {hasContact ? (
        <ul className="!list-none !pl-0 grid gap-4 sm:grid-cols-2">
          {contact.phone && <li className="rounded-2xl bg-[#eef3fa] p-6"><h2>Call</h2><a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`}>{contact.phone}</a></li>}
          {contact.whatsapp && <li className="rounded-2xl bg-[#eef3fa] p-6"><h2>WhatsApp</h2><a href={`https://wa.me/${contact.whatsapp.replace(/[^\d]/g, '')}`} target="_blank" rel="noopener noreferrer">Start a chat</a></li>}
          {contact.email && <li className="rounded-2xl bg-[#eef3fa] p-6"><h2>Email</h2><a href={`mailto:${contact.email}`}>{contact.email}</a></li>}
          {contact.address && <li className="rounded-2xl bg-[#eef3fa] p-6"><h2>Address</h2><p>{contact.address}</p></li>}
          {contact.facebook && <li className="rounded-2xl bg-[#eef3fa] p-6"><h2>Facebook</h2><a href={contact.facebook} target="_blank" rel="noopener noreferrer">Visit our page</a></li>}
          {contact.instagram && <li className="rounded-2xl bg-[#eef3fa] p-6"><h2>Instagram</h2><a href={contact.instagram} target="_blank" rel="noopener noreferrer">Visit our profile</a></li>}
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

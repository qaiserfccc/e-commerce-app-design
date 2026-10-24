import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import type { SiteChrome } from '@/lib/content-types'
import { STORE_NAME, storeContact } from '@/lib/store-config'

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function LinkColumn({ title, links }: { title: string; links: string[][] }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#79d8ff]">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-sm text-white/80">
        {links.map(([label, href]) => <li key={label}><Link href={href} className="hover:text-white hover:underline">{label}</Link></li>)}
      </ul>
    </nav>
  )
}

export function StoreFooter({ chrome }: { chrome: SiteChrome }) {
  const { contact, footer } = chrome
  const phone = storeContact.phone || contact.phone || ''
  const email = storeContact.email || contact.email || ''
  const facebook = storeContact.facebook || contact.facebook || ''
  return (
    <footer className="mt-24 border-t border-[#79d8ff]/30 bg-[#080b10] text-white shadow-[0_-18px_50px_rgba(8,11,16,0.16)]">
      <div className="grid w-full gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {footer.brands?.length ? <LinkColumn title="Brands" links={footer.brands.map((name) => [name, `/product-category/${slug(name)}`])} /> : null}
        <div className="space-y-10">
          {footer.collections?.length ? <LinkColumn title="More collections" links={footer.collections.map((name) => [name, `/product-category/${slug(name)}`])} /> : null}
          {footer.explore?.length ? <LinkColumn title="Explore more" links={footer.explore.map(([name, path]) => [name, `/product-category/${path}`])} /> : null}
        </div>
        {footer.information?.length ? <LinkColumn title="Information" links={footer.information} /> : null}
        <div>
          {footer.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={footer.logo} alt={STORE_NAME} loading="lazy" className="h-14 w-auto rounded bg-white p-1.5" />
          )}
          {footer.about && <p className="mt-4 text-sm leading-6 text-white/80">{footer.about}</p>}
          <ul className="mt-5 space-y-2 text-sm text-white/90">
            {facebook && <li><a href={facebook} target="_blank" rel="noopener noreferrer" className="hover:underline">Follow us on Facebook</a></li>}
            {email && <li><a href={`mailto:${email}`} className="hover:underline">{email}</a></li>}
            {phone && <li><a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="hover:underline">{phone}</a></li>}
            {contact.address && <li className="text-white/80">{contact.address}</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/15">
        <p className="w-full px-4 py-5 text-xs text-white/70 sm:px-6">
          Copyright {new Date().getFullYear()} © {STORE_NAME} All Rights Reserved. Contact lenses are medical devices; follow the guidance of your eye-care professional.
        </p>
      </div>
      {storeContact.whatsapp && (
        <a
          href={`https://wa.me/${storeContact.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          className="fixed bottom-5 right-5 z-30 grid size-14 place-items-center rounded-full bg-[#25d366] text-white shadow-lg hover:scale-105"
        >
          <MessageCircle size={26} aria-hidden="true" />
        </a>
      )}
    </footer>
  )
}

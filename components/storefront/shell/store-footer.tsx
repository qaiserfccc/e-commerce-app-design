import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { dummyContact, dummyFooter } from '@/lib/dummy/eyelenses-home'
import { STORE_NAME, storeContact } from '@/lib/store-config'

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function LinkColumn({ title, links }: { title: string; links: string[][] }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-sm font-bold uppercase tracking-widest">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-sm text-white/80">
        {links.map(([label, href]) => <li key={label}><Link href={href} className="hover:text-white hover:underline">{label}</Link></li>)}
      </ul>
    </nav>
  )
}

export function StoreFooter() {
  const phone = storeContact.phone || dummyContact.phone
  const email = storeContact.email || dummyContact.email
  const facebook = storeContact.facebook || dummyContact.facebook
  return (
    <footer className="mt-20 border-t border-cyan-200/60 bg-gradient-to-br from-[#075985] via-[#0e7490] to-[#164e63] text-white shadow-[0_-12px_40px_rgba(8,145,178,0.12)]">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <LinkColumn title="Brands" links={dummyFooter.brands.map((name) => [name, `/product-category/${slug(name)}`])} />
        <div className="space-y-10">
          <LinkColumn title="More collections" links={dummyFooter.collections.map((name) => [name, `/product-category/${slug(name)}`])} />
          <LinkColumn title="Explore more" links={dummyFooter.explore.map(([name, path]) => [name, `/product-category/${path}`])} />
        </div>
        <LinkColumn title="Information" links={dummyFooter.information} />
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dummyFooter.logo} alt={STORE_NAME} loading="lazy" className="h-14 w-auto rounded bg-white p-1.5" />
          <p className="mt-4 text-sm leading-6 text-white/80">{dummyFooter.about}</p>
          <ul className="mt-5 space-y-2 text-sm text-white/90">
            <li><a href={facebook} target="_blank" rel="noopener noreferrer" className="hover:underline">Follow us on Facebook</a></li>
            <li><a href={`mailto:${email}`} className="hover:underline">{email}</a></li>
            <li><a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="hover:underline">{phone}</a></li>
            <li className="text-white/80">{dummyContact.address}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/15">
        <p className="mx-auto max-w-[1320px] px-4 py-5 text-xs text-white/70 sm:px-6">
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

import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { STORE_NAME, storeContact } from '@/lib/store-config'

const shopLinks = [
  ['/shop', 'Shop all'],
  ['/product-category/new-arrival-contact-lenses-pakistan', 'New arrivals'],
  ['/product-category/deals-contact-lenses-pakistan', 'Deals'],
  ['/product-category/contact-lens-solutions-pakistan', 'Solutions'],
  ['/product-category/contact-lens-travel-kit-in-pakistan', 'Travel kits'],
]

const helpLinks = [
  ['/my-account', 'My account'],
  ['/cart', 'Cart'],
  ['/checkout', 'Checkout'],
  ['/faq', 'FAQ'],
  ['/contact-us', 'Contact us'],
]

const policyLinks = [
  ['/shipping-returns', 'Shipping & returns'],
  ['/privacy-policy', 'Privacy policy'],
  ['/terms-conditions', 'Terms & conditions'],
  ['/blogs', 'Blogs'],
]

function LinkColumn({ title, links }: { title: string; links: string[][] }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-sm font-bold uppercase tracking-widest text-white">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-sm text-white/80">
        {links.map(([href, label]) => <li key={href}><Link href={href} className="hover:text-white hover:underline">{label}</Link></li>)}
      </ul>
    </nav>
  )
}

export function StoreFooter() {
  return (
    <footer className="mt-20 bg-[#033473] text-white">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="text-2xl font-extrabold tracking-tight">{STORE_NAME}</p>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/80">
            Contact lenses from a range of brands, delivered across Pakistan. Orders are paid in cash on delivery.
          </p>
          <ul className="mt-5 space-y-1.5 text-sm text-white/90">
            {storeContact.phone && <li><a href={`tel:${storeContact.phone.replace(/[^\d+]/g, '')}`} className="hover:underline">{storeContact.phone}</a></li>}
            {storeContact.email && <li><a href={`mailto:${storeContact.email}`} className="hover:underline">{storeContact.email}</a></li>}
            {storeContact.instagram && <li><a href={storeContact.instagram} rel="noopener noreferrer" target="_blank" className="hover:underline">Instagram</a></li>}
            {storeContact.facebook && <li><a href={storeContact.facebook} rel="noopener noreferrer" target="_blank" className="hover:underline">Facebook</a></li>}
          </ul>
        </div>
        <LinkColumn title="Shop" links={shopLinks} />
        <LinkColumn title="Help" links={helpLinks} />
        <LinkColumn title="Policies" links={policyLinks} />
      </div>
      <div className="border-t border-white/15">
        <p className="mx-auto max-w-[1320px] px-4 py-5 text-xs text-white/70 sm:px-6">
          © {new Date().getFullYear()} {STORE_NAME}. Contact lenses are medical devices; follow the guidance of your eye-care professional.
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

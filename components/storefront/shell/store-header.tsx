'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, Menu, Phone, Search, ShoppingBag, User, X } from 'lucide-react'
import { MiniCart } from '@/components/storefront/shell/mini-cart'
import { useStorefrontCart } from '@/lib/hooks/use-storefront-cart'
import { useStorefrontCategories } from '@/lib/hooks/use-storefront-categories'
import type { SiteChrome } from '@/lib/content-types'
import { categoryHref, categoryTree, STORE_NAME, storeContact } from '@/lib/store-config'

export function StoreHeader({ chrome }: { chrome: SiteChrome }) {
  const announcements = chrome.announcements
  const headerPhone = storeContact.phone || chrome.contact.phone || ''
  const headerEmail = storeContact.email || chrome.contact.email || ''
  const router = useRouter()
  const pathname = usePathname()
  const { count } = useStorefrontCart()
  const { categories } = useStorefrontCategories()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [announcement, setAnnouncement] = useState(0)

  const tree = useMemo(() => categoryTree(categories), [categories])
  const roots = tree.get(0) ?? []

  useEffect(() => {
    setMobileOpen(false)
    setCartOpen(false)
    setSearchOpen(false)
  }, [pathname])

  useEffect(() => {
    const id = window.setInterval(() => setAnnouncement((value) => (value + 1) % Math.max(announcements.length, 1)), 4000)
    return () => window.clearInterval(id)
  }, [announcements.length])

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    const term = query.trim()
    router.push(term ? `/shop?q=${encodeURIComponent(term)}` : '/shop')
    setSearchOpen(false)
  }

  const searchForm = (
    <form role="search" onSubmit={submitSearch} className="flex w-full items-center overflow-hidden rounded-full border border-[#033473]/30 bg-white focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#033473]">
      <label className="sr-only" htmlFor="store-search">Search lenses</label>
      <input
        id="store-search"
        type="search"
        value={query}
        maxLength={100}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search for lenses, brands, colors…"
        className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm outline-none"
      />
      <button type="submit" aria-label="Search" className="grid h-10 w-12 place-items-center bg-[#075985] text-white hover:bg-[#0a4fa3]">
        <Search size={17} aria-hidden="true" />
      </button>
    </form>
  )

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/75 shadow-[0_8px_30px_rgba(8,145,178,0.10)] backdrop-blur-xl">
      <div className="bg-[#075985] text-white">
        <div className="mx-auto flex h-9 max-w-[1320px] items-center justify-between gap-4 px-4 text-xs sm:px-6">
          <p className="hidden min-w-0 items-center gap-2 truncate sm:flex" aria-live="off">
            {headerPhone && <a href={`tel:${headerPhone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1.5 hover:underline"><Phone size={12} aria-hidden="true" />{headerPhone}</a>}
            {headerEmail && <a href={`mailto:${headerEmail}`} className="ml-3 hover:underline">{headerEmail}</a>}
          </p>
          <p className="flex-1 truncate text-center font-medium">{announcements.length > 0 && `⚡ ${announcements[announcement % announcements.length]}`}</p>
          <Link href="/contact-us" className="hidden shrink-0 hover:underline sm:inline">Contact us</Link>
        </div>
      </div>

      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-3 px-4 sm:px-6">
        <button type="button" aria-label="Open menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)} className="grid size-10 place-items-center rounded-full hover:bg-[#e0f2fe] lg:hidden">
          <Menu size={22} aria-hidden="true" />
        </button>
        <Link href="/" className="flex shrink-0 items-center gap-2 text-[#033473]">
          <span className="grid size-9 place-items-center rounded-full bg-[#075985] text-white"><span className="size-3.5 rounded-full border-2 border-white" /></span>
          <span className="text-xl font-extrabold tracking-tight">{STORE_NAME}</span>
        </Link>
        <div className="mx-6 hidden max-w-xl flex-1 lg:block">{searchForm}</div>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" aria-label="Search" aria-expanded={searchOpen} onClick={() => setSearchOpen((open) => !open)} className="grid size-10 place-items-center rounded-full hover:bg-[#e0f2fe] lg:hidden">
            <Search size={20} aria-hidden="true" />
          </button>
          <Link href="/my-account" aria-label="My account" className="grid size-10 place-items-center rounded-full hover:bg-[#e0f2fe]">
            <User size={20} aria-hidden="true" />
          </Link>
          <button type="button" onClick={() => setCartOpen(true)} aria-label={`Open cart, ${count} items`} className="relative grid size-10 place-items-center rounded-full hover:bg-[#e0f2fe]">
            <ShoppingBag size={20} aria-hidden="true" />
            {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-[#033473] px-1 text-xs font-bold leading-5 text-white">{count}</span>}
          </button>
        </div>
      </div>
      {searchOpen && <div className="border-t border-[#033473]/10 px-4 py-3 lg:hidden">{searchForm}</div>}

      <nav aria-label="Main" className="hidden border-t border-[#033473]/10 lg:block">
        <ul className="mx-auto flex max-w-[1320px] items-center gap-1 px-6 text-sm font-semibold">
          <li><Link href="/" className="block px-3 py-3 hover:text-[#0a4fa3]">Home</Link></li>
          <li><Link href="/shop" className="block px-3 py-3 hover:text-[#0a4fa3]">Shop all</Link></li>
          {roots.slice(0, 8).map((root) => {
            const kids = tree.get(root.sourceCategoryId) ?? []
            return (
              <li key={root.sourceCategoryId} className="group relative">
                <Link href={categoryHref(root)} className="flex items-center gap-1 px-3 py-3 uppercase tracking-wide hover:text-[#0a4fa3]">
                  {root.name}
                  {kids.length > 0 && <ChevronDown size={14} aria-hidden="true" />}
                </Link>
                {kids.length > 0 && (
                  <div className="invisible absolute left-0 top-full z-50 max-h-[70vh] min-w-64 overflow-auto rounded-b-lg border border-[#033473]/15 bg-white p-2 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                    {kids.map((kid) => (
                      <Link key={kid.sourceCategoryId} href={categoryHref(kid)} className="block rounded px-3 py-2 text-sm font-medium hover:bg-[#e0f2fe] hover:text-[#033473]">{kid.name}</Link>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
          <li className="ml-auto"><Link href="/blogs" className="block px-3 py-3 hover:text-[#0a4fa3]">Blogs</Link></li>
        </ul>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex h-16 items-center justify-between bg-[#033473] px-4 text-white">
              <span className="text-lg font-bold">{STORE_NAME}</span>
              <button type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)} className="grid size-10 place-items-center"><X size={22} /></button>
            </div>
            <ul className="flex-1 overflow-y-auto py-2 text-sm font-semibold">
              {[['/', 'Home'], ['/shop', 'Shop all'], ['/blogs', 'Blogs'], ['/faq', 'FAQ'], ['/contact-us', 'Contact us'], ['/my-account', 'My account']].map(([href, label]) => (
                <li key={href}><Link href={href} className="block border-b border-[#033473]/10 px-5 py-3.5">{label}</Link></li>
              ))}
              <li className="px-5 pb-1 pt-4 text-xs font-bold uppercase tracking-widest text-[#4a5568]">Brands &amp; collections</li>
              {roots.map((root) => {
                const kids = tree.get(root.sourceCategoryId) ?? []
                const open = expanded === root.sourceCategoryId
                return (
                  <li key={root.sourceCategoryId} className="border-b border-[#033473]/10">
                    <div className="flex items-center">
                      <Link href={categoryHref(root)} className="flex-1 px-5 py-3.5 uppercase">{root.name}</Link>
                      {kids.length > 0 && (
                        <button type="button" aria-expanded={open} aria-label={`Toggle ${root.name} collections`} onClick={() => setExpanded(open ? null : root.sourceCategoryId)} className="grid size-12 place-items-center">
                          <ChevronDown size={18} className={open ? 'rotate-180' : ''} />
                        </button>
                      )}
                    </div>
                    {open && (
                      <ul className="bg-[#eef3fa] py-1">
                        {kids.map((kid) => <li key={kid.sourceCategoryId}><Link href={categoryHref(kid)} className="block px-8 py-2.5 font-medium">{kid.name}</Link></li>)}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}

      <MiniCart open={cartOpen} onClose={() => setCartOpen(false)} />
    </header>
  )
}

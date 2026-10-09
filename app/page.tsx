'use client'

import { useState } from 'react'
import { CircleDot, Menu, X } from 'lucide-react'
import { AdminWorkspace } from '@/components/admin/admin-workspace'
import { StorefrontPanel } from '@/components/storefront/storefront-panel'

export default function Page() {
  const [view, setView] = useState<'storefront' | 'admin'>('storefront')
  const [mobileOpen, setMobileOpen] = useState(false)

  function chooseView(nextView: 'storefront' | 'admin') {
    setView(nextView)
    setMobileOpen(false)
  }

  return (
    <main className="min-h-screen bg-[#edf4ef] text-[#152a52]">
      <header className="sticky top-0 z-30 border-b border-[#152a52]/15 bg-[#edf4ef]">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={mobileOpen}
              className="grid size-10 place-items-center border border-[#152a52]/20 hover:bg-[#d3ff48] focus-visible:outline-2 focus-visible:outline-[#152a52] lg:hidden"
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
            <a href="/" className="flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-[#152a52]">
              <span className="grid size-9 place-items-center rounded-full bg-[#152a52] text-[#d3ff48]"><CircleDot size={20} strokeWidth={1.8} /></span>
              <span className="text-lg font-black uppercase tracking-[-.055em]">ISK <span className="font-medium normal-case tracking-[-.035em]">Lenses</span></span>
            </a>
          </div>
          <nav aria-label="Application view" className="hidden items-center gap-1 border border-[#152a52]/20 p-1 md:flex">
            <button
              type="button"
              aria-pressed={view === 'storefront'}
              onClick={() => chooseView('storefront')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-[.1em] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#152a52] ${view === 'storefront' ? 'bg-[#152a52] text-[#d3ff48]' : 'text-[#152a52] hover:bg-[#dbe7e1]'}`}
            >
              Storefront
            </button>
            <button
              type="button"
              aria-pressed={view === 'admin'}
              onClick={() => chooseView('admin')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-[.1em] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#152a52] ${view === 'admin' ? 'bg-[#152a52] text-[#d3ff48]' : 'text-[#152a52] hover:bg-[#dbe7e1]'}`}
            >
              Admin workspace
            </button>
          </nav>
          <span className="hidden font-mono text-[10px] uppercase tracking-[.18em] text-[#314a63] sm:block">{view === 'storefront' ? 'Catalogue / PK' : 'Operations / PK'}</span>
        </div>
      </header>
      {mobileOpen && (
        <nav aria-label="Mobile application view" className="fixed inset-x-0 top-[72px] z-20 flex gap-2 border-b border-[#152a52]/20 bg-[#edf4ef] p-4 md:hidden">
          <button type="button" aria-pressed={view === 'storefront'} onClick={() => chooseView('storefront')} className={`flex-1 border px-4 py-3 text-xs font-bold uppercase tracking-[.1em] focus-visible:outline-2 focus-visible:outline-[#152a52] ${view === 'storefront' ? 'border-[#152a52] bg-[#152a52] text-[#d3ff48]' : 'border-[#152a52]/20 bg-white'}`}>Storefront</button>
          <button type="button" aria-pressed={view === 'admin'} onClick={() => chooseView('admin')} className={`flex-1 border px-4 py-3 text-xs font-bold uppercase tracking-[.1em] focus-visible:outline-2 focus-visible:outline-[#152a52] ${view === 'admin' ? 'border-[#152a52] bg-[#152a52] text-[#d3ff48]' : 'border-[#152a52]/20 bg-white'}`}>Admin</button>
        </nav>
      )}
      {view === 'storefront' ? <StorefrontPanel /> : <AdminWorkspace />}
    </main>
  )
}

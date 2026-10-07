'use client'

import { useState } from 'react'
import { Menu, Sparkles, X } from 'lucide-react'
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
    <main className="min-h-screen bg-[#f6f5f2] text-[#1c1c1a]">
      <header className="sticky top-0 z-30 border-b border-[#1c1c1a]/10 bg-[#f6f5f2]/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 lg:px-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={mobileOpen}
              className="rounded-full p-2 hover:bg-white focus-visible:outline-2 focus-visible:outline-[#1c1c1a] lg:hidden"
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-full bg-[#1c1c1a] text-[#f6f5f2]"><Sparkles size={15} /></div>
              <span className="text-lg font-semibold tracking-[-.04em]">morrow.</span>
            </div>
          </div>
          <nav aria-label="Application view" className="hidden items-center gap-1 rounded-full border border-[#1c1c1a]/10 bg-white/70 p-1 md:flex">
            <button
              type="button"
              aria-pressed={view === 'storefront'}
              onClick={() => chooseView('storefront')}
              className={`rounded-full px-4 py-2 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c1c1a] ${view === 'storefront' ? 'bg-[#1c1c1a] text-white' : 'text-[#55544e] hover:bg-[#f2f1ed]'}`}
            >
              Storefront
            </button>
            <button
              type="button"
              aria-pressed={view === 'admin'}
              onClick={() => chooseView('admin')}
              className={`rounded-full px-4 py-2 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c1c1a] ${view === 'admin' ? 'bg-[#1c1c1a] text-white' : 'text-[#55544e] hover:bg-[#f2f1ed]'}`}
            >
              Admin workspace
            </button>
          </nav>
          <span className="text-xs text-[#68675f]">{view === 'storefront' ? 'Shop' : 'Operations'}</span>
        </div>
      </header>
      {mobileOpen && (
        <nav aria-label="Mobile application view" className="fixed inset-x-0 top-[72px] z-20 flex gap-2 border-b border-[#1c1c1a]/10 bg-[#f6f5f2] p-4 md:hidden">
          <button type="button" aria-pressed={view === 'storefront'} onClick={() => chooseView('storefront')} className="flex-1 rounded-full bg-white px-4 py-3 text-sm focus-visible:outline-2 focus-visible:outline-[#1c1c1a]">Storefront</button>
          <button type="button" aria-pressed={view === 'admin'} onClick={() => chooseView('admin')} className="flex-1 rounded-full bg-[#1c1c1a] px-4 py-3 text-sm text-white focus-visible:outline-2 focus-visible:outline-[#1c1c1a]">Admin</button>
        </nav>
      )}
      {view === 'storefront' ? <StorefrontPanel /> : <AdminWorkspace />}
    </main>
  )
}

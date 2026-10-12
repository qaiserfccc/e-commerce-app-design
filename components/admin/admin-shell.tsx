'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { AdminWorkspace } from '@/components/admin/admin-workspace'

export function AdminShell() {
  return (
    <div className="admin-theme min-h-screen">
      <header className="bg-[#033473] text-white">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <span className="text-lg font-extrabold tracking-tight">ISK Lenses <span className="font-medium opacity-80">· Admin</span></span>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline">View store <ExternalLink size={14} aria-hidden="true" /></Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-5 py-6 sm:px-8 lg:px-12"><AdminWorkspace /></main>
    </div>
  )
}

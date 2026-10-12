import type { ReactNode } from 'react'
import Link from 'next/link'

export function ContentPage({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <main>
      <div className="bg-[#eef3fa]">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <nav aria-label="Breadcrumb" className="text-xs text-[#4a5568]"><Link href="/" className="hover:underline">Home</Link> / <span className="font-semibold text-[#0a0a0a]">{title}</span></nav>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#033473] sm:text-4xl">{title}</h1>
          {intro && <p className="mt-3 max-w-2xl text-base leading-7 text-[#4a5568]">{intro}</p>}
        </div>
      </div>
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 text-base leading-7 sm:px-6 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-[#033473] [&_a]:font-medium [&_a]:text-[#033473] [&_a]:underline [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
    </main>
  )
}

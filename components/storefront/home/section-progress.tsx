'use client'

import { useEffect, useState } from 'react'

const sections = [
  ['hero', 'Featured collections'],
  ['bloom', 'Color previews'],
  ['brands', 'Brands'],
  ['shades', 'Shades'],
  ['trending', 'Catalog'],
  ['types', 'Lens types'],
  ['why-us', 'About ISK Lenses'],
  ['reviews', 'Customer notes'],
  ['contact', 'Contact'],
] as const

export function SectionProgress() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const nodes = sections.map(([id]) => document.getElementById(id)).filter((node): node is HTMLElement => Boolean(node))
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (!visible) return
      const index = sections.findIndex(([id]) => id === visible.target.id)
      if (index >= 0) setActive(index)
    }, { threshold: [0.2, 0.45, 0.7] })
    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  return (
    <nav aria-label="Homepage sections" className="fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-end gap-5 xl:flex">
      <span className="mb-1 font-mono text-xs tracking-[0.18em] text-[#686371]" aria-live="polite">
        {String(active + 1).padStart(2, '0')} / {String(sections.length).padStart(2, '0')}
      </span>
      {sections.map(([id, label], index) => (
        <a
          key={id}
          href={`#${id}`}
          aria-label={`${label}, section ${index + 1} of ${sections.length}`}
          aria-current={active === index ? 'location' : undefined}
          className={`h-2.5 rounded-full transition-all duration-300 ${active === index ? 'w-8 bg-[#e84f88]' : 'w-2.5 bg-[#201b35]/30 hover:bg-[#b83f6b]'}`}
        />
      ))}
    </nav>
  )
}

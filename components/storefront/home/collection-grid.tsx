'use client'

import { Children, useId, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react'

export function CollectionGrid({
  children,
  className,
  label,
  nextSectionId,
  nextLabel,
  initialCount = 4,
}: {
  children: ReactNode
  className: string
  label: string
  nextSectionId: string
  nextLabel: string
  initialCount?: number
}) {
  const [expanded, setExpanded] = useState(false)
  const items = Children.toArray(children)
  const listId = useId()
  const hasMore = items.length > initialCount

  function continueToNextSection() {
    const root = document.getElementById('isk-home-scroll')
    const section = document.getElementById(nextSectionId)
    if (!root || !section) return

    const top = root.scrollTop + section.getBoundingClientRect().top - root.getBoundingClientRect().top
    root.scrollTo({
      top,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    })
  }

  return (
    <div>
      <ul id={listId} className={className}>
        {items.slice(0, expanded ? items.length : initialCount)}
      </ul>
      {(hasMore || nextSectionId) && (
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {hasMore && (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={listId}
              onClick={() => setExpanded((current) => !current)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#b8d4e0] bg-white px-5 text-sm font-semibold text-[#15384d] transition-colors hover:border-[#087ba5] hover:bg-[#e8f6fb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087ba5]"
            >
              {expanded ? 'Show fewer' : `Show all ${label}`}
              {expanded ? <ArrowUp size={16} aria-hidden="true" /> : <ArrowDown size={16} aria-hidden="true" />}
            </button>
          )}
          <button
            type="button"
            onClick={continueToNextSection}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#006f9b] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#087ba5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087ba5]"
          >
            Continue to {nextLabel}
            <ArrowDown size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}

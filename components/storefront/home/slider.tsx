'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface SliderProps {
  label: string
  children: ReactNode[]
  autoPlayMs?: number
  dots?: boolean
  arrows?: boolean
  perView?: string
}

// Scroll-snap carousel with optional autoplay, arrows and dots.
export function Slider({ label, children, autoPlayMs = 0, dots = false, arrows = true, perView = 'basis-full' }: SliderProps) {
  const track = useRef<HTMLUListElement>(null)
  const paused = useRef(false)
  const [index, setIndex] = useState(0)
  const count = children.length

  function go(next: number) {
    const el = track.current
    if (!el) return
    const target = (next + count) % count
    const item = el.children[target] as HTMLElement | undefined
    el.scrollTo({ left: item?.offsetLeft ?? 0, behavior: 'smooth' })
    setIndex(target)
  }

  useEffect(() => {
    if (!autoPlayMs || count < 2) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const id = window.setInterval(() => { if (!paused.current) go(index + 1) }, autoPlayMs)
    return () => window.clearInterval(id)
  })

  function onScroll() {
    const el = track.current
    if (!el) return
    const first = el.children[0] as HTMLElement | undefined
    if (first?.offsetWidth) setIndex(Math.round(el.scrollLeft / first.offsetWidth))
  }

  return (
    <div
      className="relative"
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => { paused.current = true }}
      onMouseLeave={() => { paused.current = false }}
      onFocus={() => { paused.current = true }}
      onBlur={() => { paused.current = false }}
    >
      <ul ref={track} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children.map((child, i) => (
          <li key={i} className={`${perView} shrink-0 snap-start`} aria-roledescription="slide" aria-label={`${i + 1} of ${count}`}>{child}</li>
        ))}
      </ul>
      {arrows && count > 1 && (
        <>
          <button type="button" aria-label="Previous" onClick={() => go(index - 1)} className="absolute left-3 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#033473] shadow hover:bg-white sm:grid"><ChevronLeft size={22} aria-hidden="true" /></button>
          <button type="button" aria-label="Next" onClick={() => go(index + 1)} className="absolute right-3 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#033473] shadow hover:bg-white sm:grid"><ChevronRight size={22} aria-hidden="true" /></button>
        </>
      )}
      {dots && count > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
          {children.map((_, i) => (
            <button key={i} type="button" aria-label={`Go to slide ${i + 1}`} aria-current={i === index} onClick={() => go(i)} className={`size-2.5 rounded-full ${i === index ? 'bg-white' : 'bg-white/50'}`} />
          ))}
        </div>
      )}
    </div>
  )
}

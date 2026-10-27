'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'

interface SliderProps {
  label: string
  children: ReactNode[]
  autoPlayMs?: number
  dots?: boolean
  arrows?: boolean
  perView?: string
  editorialControls?: boolean
  fullHeight?: boolean
}

// Scroll-snap carousel with optional autoplay, arrows and dots.
export function Slider({ label, children, autoPlayMs = 0, dots = false, arrows = true, perView = 'basis-full', editorialControls = false, fullHeight = false }: SliderProps) {
  const track = useRef<HTMLUListElement>(null)
  const paused = useRef(false)
  const [index, setIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(autoPlayMs > 0)
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
    if (!autoPlayMs || count < 2 || !isPlaying) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const id = window.setInterval(() => { if (!paused.current) go(index + 1) }, autoPlayMs)
    return () => window.clearInterval(id)
  }, [autoPlayMs, count, index, isPlaying])

  function onScroll() {
    const el = track.current
    if (!el) return
    const first = el.children[0] as HTMLElement | undefined
    if (first?.offsetWidth) setIndex(Math.round(el.scrollLeft / first.offsetWidth))
  }

  return (
    <div
      className={`relative ${fullHeight ? 'h-full' : ''}`}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => { paused.current = true }}
      onMouseLeave={() => { paused.current = false }}
      onFocus={() => { paused.current = true }}
      onBlur={() => { paused.current = false }}
    >
      <ul ref={track} onScroll={onScroll} className={`flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${fullHeight ? 'h-full' : ''}`}>
        {children.map((child, i) => (
          <li key={i} className={`${perView} ${fullHeight ? 'h-full' : ''} min-w-0 shrink-0 snap-start`} aria-roledescription="slide" aria-label={`${i + 1} of ${count}`}>{child}</li>
        ))}
      </ul>
      {arrows && count > 1 && (
        editorialControls ? (
          <div className="absolute bottom-6 right-5 flex items-center gap-3 sm:bottom-8 sm:right-8">
            <button type="button" aria-label="Previous slide" onClick={() => go(index - 1)} className="grid size-11 place-items-center rounded-full border border-[#201b35]/30 text-[#201b35] transition hover:bg-white/80"><ChevronLeft size={20} aria-hidden="true" /></button>
            <button type="button" aria-label="Next slide" onClick={() => go(index + 1)} className="grid size-11 place-items-center rounded-full border border-[#201b35]/30 text-[#201b35] transition hover:bg-white/80"><ChevronRight size={20} aria-hidden="true" /></button>
          </div>
        ) : (
          <>
            <button type="button" aria-label="Previous" onClick={() => go(index - 1)} className="absolute left-3 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#033473] shadow hover:bg-white sm:grid"><ChevronLeft size={22} aria-hidden="true" /></button>
            <button type="button" aria-label="Next" onClick={() => go(index + 1)} className="absolute right-3 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#033473] shadow hover:bg-white sm:grid"><ChevronRight size={22} aria-hidden="true" /></button>
          </>
        )
      )}
      {dots && count > 1 && (
        <div className={editorialControls ? 'absolute bottom-6 left-5 flex gap-4 sm:bottom-8 sm:left-8' : 'absolute inset-x-0 bottom-3 flex justify-center gap-2'}>
          {children.map((_, i) => editorialControls ? (
            <button key={i} type="button" aria-label={`Show slide ${i + 1}`} aria-current={i === index} onClick={() => go(i)} className="group flex flex-col items-start gap-2 py-1">
              <span className={`relative block h-0.5 w-12 overflow-hidden rounded-full sm:w-16 ${i === index ? 'bg-[#e84f88]' : 'bg-[#201b35]/25'}`} />
              <span className="text-xs font-medium text-[#201b35]/70">{String(i + 1).padStart(2, '0')}</span>
            </button>
          ) : (
            <button key={i} type="button" aria-label={`Go to slide ${i + 1}`} aria-current={i === index} onClick={() => go(i)} className={`size-2.5 rounded-full ${i === index ? 'bg-white' : 'bg-white/50'}`} />
          ))}
        </div>
      )}
      {autoPlayMs > 0 && count > 1 && (
        <button
          type="button"
          aria-label={isPlaying ? 'Pause autoplay' : 'Resume autoplay'}
          onClick={() => setIsPlaying((playing) => !playing)}
          className={`absolute grid size-9 place-items-center rounded-full text-[#201b35] shadow-sm transition hover:bg-white ${editorialControls ? 'bottom-7 right-[7.25rem] sm:bottom-9 sm:right-[8.25rem]' : 'bottom-1.5 right-3 bg-white/90 sm:bottom-2 sm:right-5'}`}
        >
          {isPlaying ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
        </button>
      )}
    </div>
  )
}

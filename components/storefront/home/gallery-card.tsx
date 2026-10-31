'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { StorefrontFallbackImage } from '@/components/storefront/fallback-image'

export function GalleryCard({
  href,
  title,
  detail,
  image,
  imageFallback,
  imageAlt,
  imageFit = 'cover',
  video,
  fallback,
}: {
  href: string
  title: string
  detail: string
  image?: string | null
  imageFallback?: string | null
  imageAlt?: string
  imageFit?: 'cover' | 'contain'
  video?: string | null
  fallback?: ReactNode
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing) return
    const element = videoRef.current
    if (!element) return
    const media = element

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) stopPreview()
    })
    const handleVisibility = () => {
      if (document.hidden) stopPreview()
    }

    function stopPreview() {
      media.pause()
      media.currentTime = 0
      setPlaying(false)
    }

    observer.observe(media)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [playing])

  function startPreview() {
    if (!video || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const element = videoRef.current
    if (!element) return

    setPlaying(true)
    void element.play().catch(() => setPlaying(false))
  }

  function stopPreview() {
    setPlaying(false)
    const element = videoRef.current
    if (element) {
      element.pause()
      element.currentTime = 0
    }
  }

  return (
    <Link
      href={href}
      onPointerEnter={(event) => {
        if (event.pointerType !== 'touch') startPreview()
      }}
      onPointerLeave={stopPreview}
      onFocus={startPreview}
      onBlur={stopPreview}
      className="group relative isolate block aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-[#15384d] text-white outline-none focus-visible:ring-4 focus-visible:ring-[#087ba5] focus-visible:ring-offset-4 focus-visible:ring-offset-[#f7fcff]"
      aria-label={`${title}. ${detail}`}
    >
      <StorefrontFallbackImage
        sources={[image, imageFallback]}
        alt={imageAlt ?? ''}
        className={`absolute inset-0 size-full transition duration-700 ease-out group-hover:scale-[1.045] group-focus-visible:scale-[1.045] ${imageFit === 'contain' ? 'bg-[#e8f6fb] object-contain p-8' : 'object-cover'} ${playing ? 'opacity-0' : 'opacity-100'}`}
        fallback={<span aria-hidden="true" className="absolute inset-0 grid place-items-center bg-[#e8f6fb] p-5 text-[#15384d]">{fallback}</span>}
      />
      {video && (
        <video
          ref={videoRef}
          src={video}
          muted
          playsInline
          loop
          preload="none"
          tabIndex={-1}
          aria-hidden="true"
          className={`absolute inset-0 size-full object-cover transition duration-500 ${playing ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(0deg,rgba(7,29,43,.9)_0%,rgba(7,29,43,.2)_58%,transparent_100%)]" />
      <span aria-hidden="true" className="absolute right-4 top-4 grid size-10 place-items-center rounded-full border border-white/65 text-white transition-colors duration-200 group-hover:bg-white group-hover:text-[#15384d] group-focus-visible:bg-white group-focus-visible:text-[#15384d]">
        <ArrowUpRight size={19} />
      </span>
      <span className="absolute inset-x-0 bottom-0 flex translate-y-1 flex-col items-start p-4 text-left transition-transform duration-300 ease-out group-hover:translate-y-0 group-focus-visible:translate-y-0 sm:p-5">
        <span className="text-xl font-bold leading-tight tracking-[-0.035em] sm:text-2xl">{title}</span>
        <span className="mt-1.5 text-sm font-medium text-white/85">{detail}</span>
      </span>
    </Link>
  )
}

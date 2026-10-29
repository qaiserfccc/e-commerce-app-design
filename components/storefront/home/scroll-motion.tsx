'use client'

import { useEffect } from 'react'

export function HomeScrollMotion() {
  useEffect(() => {
    const root = document.getElementById('isk-home-scroll')
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return

    const targets = root.querySelectorAll<HTMLElement>('.isk-home-aperture-reveal')
    if (targets.length === 0) return

    root.classList.add('isk-home-motion-ready')
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        const target = entry.target as HTMLElement
        target.dataset.open = 'true'
        observer.unobserve(target)
      })
    }, { root, threshold: 0.3 })

    targets.forEach((target) => observer.observe(target))
    return () => {
      observer.disconnect()
      root.classList.remove('isk-home-motion-ready')
    }
  }, [])

  return null
}

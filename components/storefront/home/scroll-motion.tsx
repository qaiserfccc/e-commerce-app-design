'use client'

import { useEffect } from 'react'

export function HomeScrollMotion() {
  useEffect(() => {
    const root = document.getElementById('isk-home-scroll')
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return

    const targets = root.querySelectorAll<HTMLElement>('[data-scroll-reveal]')
    if (targets.length === 0) return

    root.classList.add('isk-home-motion-ready')
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        const target = entry.target as HTMLElement
        target.dataset.open = 'true'
        observer.unobserve(target)
      })
    }, { root, threshold: 0.18, rootMargin: '0px 0px -6% 0px' })

    const observeTargets = (parent: ParentNode) => {
      if (parent instanceof HTMLElement && parent.matches('[data-scroll-reveal]')) observer.observe(parent)
      parent.querySelectorAll<HTMLElement>('[data-scroll-reveal]').forEach((target) => observer.observe(target))
    }

    targets.forEach((target) => observer.observe(target))
    const mutations = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) observeTargets(node)
      }))
    })
    mutations.observe(root, { childList: true, subtree: true })
    return () => {
      mutations.disconnect()
      observer.disconnect()
      root.classList.remove('isk-home-motion-ready')
    }
  }, [])

  return null
}

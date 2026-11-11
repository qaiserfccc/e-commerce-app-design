'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'

type IntegrationConfig = {
  metaPixelId: string
  ga4MeasurementId: string
  gtmContainerId: string
  googleAdsConversionId: string
  googleAdsConversionLabel: string
  tiktokPixelId: string
}

export type GrowthEventName = 'page_view' | 'view_item' | 'add_to_cart' | 'begin_checkout' | 'purchase'
export type GrowthEventDetails = {
  pagePath?: string
  productId?: string
  value?: number
  currency?: string
}

type GrowthEvent = GrowthEventDetails & { eventName: GrowthEventName }
type Consent = 'accepted' | 'rejected' | null
type TikTokApi = ((...args: unknown[]) => void) & {
  track: (...args: unknown[]) => void
  page: () => void
  load: (pixelId: string) => void
  revokeConsent: () => void
  grantConsent: () => void
  methods: string[]
  queue: unknown[][]
}
type MetaPixelApi = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void
  queue: unknown[][]
  push: MetaPixelApi
  loaded: boolean
  version: string
}

declare global {
  interface Window {
    fbq?: MetaPixelApi
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
    ttq?: TikTokApi
  }
}

const CONSENT_KEY = 'isk-marketing-consent'
const SESSION_KEY = 'isk-growth-session'
const initializedTags = new Set<string>()
const eventNameSet = new Set<GrowthEventName>(['page_view', 'view_item', 'add_to_cart', 'begin_checkout', 'purchase'])
const metaEvents: Record<GrowthEventName, string> = {
  page_view: 'PageView',
  view_item: 'ViewContent',
  add_to_cart: 'AddToCart',
  begin_checkout: 'InitiateCheckout',
  purchase: 'Purchase',
}
const tiktokEvents: Record<GrowthEventName, string> = {
  page_view: 'ViewContent',
  view_item: 'ViewContent',
  add_to_cart: 'AddToCart',
  begin_checkout: 'InitiateCheckout',
  purchase: 'CompletePayment',
}

function sessionId() {
  const saved = sessionStorage.getItem(SESSION_KEY)
  if (saved && /^[0-9a-f-]{36}$/i.test(saved)) return saved
  const value = crypto.randomUUID()
  sessionStorage.setItem(SESSION_KEY, value)
  return value
}

function appendScript(id: string, src: string) {
  if (document.getElementById(id)) return
  const script = document.createElement('script')
  script.id = id
  script.async = true
  script.src = src
  document.head.appendChild(script)
}

function loadMarketingTags(config: IntegrationConfig) {
  if (config.metaPixelId) {
    if (!window.fbq) {
      const fbq = ((...args: unknown[]) => {
        if (fbq.callMethod) {
          fbq.callMethod(...args)
        } else {
          fbq.queue.push(args)
        }
      }) as MetaPixelApi
      fbq.queue = []
      fbq.push = fbq
      fbq.loaded = true
      fbq.version = '2.0'
      window.fbq = fbq
    }
    if (!initializedTags.has(`meta:${config.metaPixelId}`)) {
      window.fbq('init', config.metaPixelId)
      appendScript('isk-meta-pixel', 'https://connect.facebook.net/en_US/fbevents.js')
      initializedTags.add(`meta:${config.metaPixelId}`)
    }
  }

  if (config.gtmContainerId && !initializedTags.has(`gtm:${config.gtmContainerId}`)) {
    window.dataLayer = window.dataLayer ?? []
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
    appendScript('isk-google-tag-manager', `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(config.gtmContainerId)}`)
    initializedTags.add(`gtm:${config.gtmContainerId}`)
  } else if (!config.gtmContainerId && (config.ga4MeasurementId || config.googleAdsConversionId)) {
    if (!window.gtag) {
      window.dataLayer = window.dataLayer ?? []
      window.gtag = (...args: unknown[]) => window.dataLayer?.push(args)
      window.gtag('js', new Date())
    }
    const tagId = config.ga4MeasurementId || config.googleAdsConversionId
    appendScript('isk-google-analytics', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`)
    if (config.ga4MeasurementId && !initializedTags.has(`ga4:${config.ga4MeasurementId}`)) {
      window.gtag('config', config.ga4MeasurementId, { send_page_view: false })
      initializedTags.add(`ga4:${config.ga4MeasurementId}`)
    }
    if (config.googleAdsConversionId && !initializedTags.has(`ads:${config.googleAdsConversionId}`)) {
      window.gtag('config', config.googleAdsConversionId)
      initializedTags.add(`ads:${config.googleAdsConversionId}`)
    }
  }

  if (config.tiktokPixelId && !initializedTags.has(`tiktok:${config.tiktokPixelId}`)) {
    if (!window.ttq) {
      const queue: unknown[][] = []
      const api = ((...args: unknown[]) => { queue.push(args) }) as TikTokApi
      api.methods = [
        'page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once',
        'ready', 'alias', 'group', 'enableCookie', 'disableCookie', 'holdConsent',
        'revokeConsent', 'grantConsent',
      ]
      api.queue = queue
      for (const method of api.methods) {
        Object.assign(api, { [method]: (...args: unknown[]) => queue.push([method, ...args]) })
      }
      api.load = (pixelId: string) => {
        appendScript('isk-tiktok-pixel', `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(pixelId)}&lib=ttq`)
      }
      window.ttq = api
    }
    window.ttq.load(config.tiktokPixelId)
    initializedTags.add(`tiktok:${config.tiktokPixelId}`)
  }
}

function emitToProviders(event: GrowthEvent, config: IntegrationConfig) {
  const value = typeof event.value === 'number' && Number.isFinite(event.value) ? event.value : undefined
  const currency = event.currency
  const payload = {
    ...(value === undefined ? {} : { value }),
    ...(currency ? { currency } : {}),
    ...(event.productId ? { content_ids: [event.productId], content_type: 'product' } : {}),
  }

  window.dataLayer?.push({ event: `isk_${event.eventName}`, ...payload, page_path: event.pagePath })
  if (config.metaPixelId) {
    const metaEvent = metaEvents[event.eventName]
    if (window.fbq) window.fbq('track', metaEvent, payload)
  }
  if (!config.gtmContainerId && window.gtag) {
    if (event.eventName === 'purchase' && config.googleAdsConversionId && config.googleAdsConversionLabel) {
      window.gtag('event', 'conversion', {
        send_to: `${config.googleAdsConversionId}/${config.googleAdsConversionLabel}`,
        ...(value === undefined ? {} : { value }),
        ...(currency ? { currency } : {}),
      })
    }
    window.gtag('event', event.eventName, { ...payload, page_path: event.pagePath })
  }
  if (config.tiktokPixelId && window.ttq) window.ttq.track(tiktokEvents[event.eventName], payload)
}

export function trackGrowthEvent(eventName: GrowthEventName, details: GrowthEventDetails = {}) {
  if (typeof window === 'undefined' || !eventNameSet.has(eventName)) return
  window.dispatchEvent(new CustomEvent<GrowthEvent>('isk-growth-event', {
    detail: { ...details, eventName },
  }))
}

export function MarketingAnalyticsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [consent, setConsent] = useState<Consent>(null)
  const [config, setConfig] = useState<IntegrationConfig | null>(null)
  const [bannerOpen, setBannerOpen] = useState(false)
  const lastPage = useRef('')

  useEffect(() => {
    const saved = localStorage.getItem(CONSENT_KEY)
    const next = saved === 'accepted' || saved === 'rejected' ? saved : null
    setConsent(next)
    setBannerOpen(next === null)
    const syncConsent = () => {
      const value = localStorage.getItem(CONSENT_KEY)
      const valid = value === 'accepted' || value === 'rejected' ? value : null
      setConsent(valid)
      setBannerOpen(valid === null)
    }
    window.addEventListener('isk-consent-updated', syncConsent)
    return () => window.removeEventListener('isk-consent-updated', syncConsent)
  }, [])

  useEffect(() => {
    let active = true
    fetch('/api/storefront/tracking-config', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Tracking configuration is unavailable.')
        const result = await response.json() as { data: IntegrationConfig }
        if (active) setConfig(result.data)
      })
      .catch(() => {
        if (active) setConfig({
          metaPixelId: '',
          ga4MeasurementId: '',
          gtmContainerId: '',
          googleAdsConversionId: '',
          googleAdsConversionLabel: '',
          tiktokPixelId: '',
        })
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (pathname.startsWith('/admin') || consent !== 'accepted' || !config) return
    loadMarketingTags(config)
  }, [pathname, consent, config])

  useEffect(() => {
    if (pathname.startsWith('/admin') || consent !== 'accepted' || !config) return
    const send = (event: Event) => {
      const detail = (event as CustomEvent<GrowthEvent>).detail
      if (!detail || !eventNameSet.has(detail.eventName)) return
      emitToProviders(detail, config)
      const id = crypto.randomUUID()
      void fetch('/api/storefront/growth-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: id,
          sessionId: sessionId(),
          consentGranted: true,
          eventName: detail.eventName,
          pagePath: detail.pagePath || window.location.pathname,
          productId: detail.productId,
          value: detail.value,
          currency: detail.currency,
        }),
        keepalive: true,
      }).catch(() => undefined)
    }
    window.addEventListener('isk-growth-event', send)
    return () => window.removeEventListener('isk-growth-event', send)
  }, [pathname, consent, config])

  useEffect(() => {
    if (consent !== 'accepted') {
      lastPage.current = ''
      return
    }
    if (pathname.startsWith('/admin') || !config || lastPage.current === pathname) return
    lastPage.current = pathname
    trackGrowthEvent('page_view', { pagePath: pathname })
    if (/^\/product\/[^/]+\/?$/.test(pathname)) trackGrowthEvent('view_item', { pagePath: pathname })
    if (pathname === '/checkout' || pathname === '/checkout/') trackGrowthEvent('begin_checkout', { pagePath: pathname })
  }, [pathname, consent, config])

  function chooseConsent(value: Exclude<Consent, null>) {
    localStorage.setItem(CONSENT_KEY, value)
    setConsent(value)
    setBannerOpen(false)
    if (value === 'rejected') {
      window.fbq?.('consent', 'revoke')
      window.ttq?.revokeConsent()
      window.gtag?.('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      })
      window.dataLayer?.push({ event: 'isk_consent_rejected' })
    } else {
      window.fbq?.('consent', 'grant')
      window.ttq?.grantConsent()
      window.gtag?.('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      })
      window.dataLayer?.push({ event: 'isk_consent_accepted' })
    }
    window.dispatchEvent(new Event('isk-consent-updated'))
  }

  if (pathname.startsWith('/admin')) return <>{children}</>

  return (
    <>
      {children}
      {!bannerOpen ? (
        <button
          type="button"
          onClick={() => setBannerOpen(true)}
          className="fixed bottom-3 left-3 z-[60] rounded-full border border-[#cfe2eb] bg-white px-3 py-2 text-xs font-medium text-[#15384d] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087ba5]"
        >
          Privacy settings
        </button>
      ) : (
        <section
          aria-label="Optional analytics preferences"
          className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl rounded-2xl border border-[#cfe2eb] bg-white p-4 text-[#15384d] shadow-lg sm:inset-x-6 sm:p-5"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-sm font-semibold">Your privacy choices</h2>
              <p className="mt-1 text-xs leading-5 text-[#526b7b]">
                Optional analytics and marketing tags help measure visits and shopping steps. They remain off unless you allow them. You can change this choice later in Privacy settings.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button type="button" onClick={() => chooseConsent('rejected')} className="min-h-10 rounded-full border border-[#cfe2eb] px-4 text-xs font-semibold hover:bg-[#e8f6fb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087ba5]">
                Reject optional
              </button>
              <button type="button" onClick={() => chooseConsent('accepted')} className="min-h-10 rounded-full bg-[#006f9b] px-4 text-xs font-semibold text-white hover:bg-[#005d83] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087ba5]">
                Allow analytics
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  )
}

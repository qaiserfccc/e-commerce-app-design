import 'server-only'

import { asc } from 'drizzle-orm'
import { cached } from '@/lib/cache'
import type {
  BannerContent,
  ContactSettings,
  FooterSettings,
  HeadingSettings,
  HomeContent,
  ReviewContent,
  SeoSection,
  SettingKey,
  SiteChrome,
} from '@/lib/content-types'
import { db } from '@/lib/db'
import { storeBanners, storeReviews, storeSettings } from '@/lib/db/schema'

export const CONTENT_NAMESPACE = 'content'
const TTL_SECONDS = 300

async function loadSettings() {
  const rows = await db.select().from(storeSettings)
  return new Map(rows.map((row) => [row.key as SettingKey, row.value]))
}

export function getSettings() {
  return cached(CONTENT_NAMESPACE, 'settings', TTL_SECONDS, async () => Object.fromEntries(await loadSettings()) as Partial<Record<SettingKey, unknown>>)
}

const asStrings = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [])

export async function getSiteChrome(): Promise<SiteChrome> {
  try {
    const settings = await getSettings()
    return {
      announcements: asStrings(settings.announcements),
      contact: (settings.contact ?? {}) as ContactSettings,
      footer: (settings.footer ?? {}) as FooterSettings,
    }
  } catch (error) {
    console.error('[site-content] Site chrome unavailable', error instanceof Error ? error.name : 'UnknownError')
    return {
      announcements: [],
      contact: {},
      footer: {},
      loadError: 'Store announcements and contact details could not be loaded.',
    }
  }
}

export function getAllBanners() {
  return cached(CONTENT_NAMESPACE, 'banners:all', TTL_SECONDS, async (): Promise<BannerContent[]> => {
    const rows = await db.select().from(storeBanners).orderBy(asc(storeBanners.placement), asc(storeBanners.sortOrder), asc(storeBanners.createdAt))
    return rows.map(({ id, placement, title, body, imageUrl, href, sortOrder, isActive }) => ({ id, placement: placement as BannerContent['placement'], title, body, imageUrl, href, sortOrder, isActive }))
  })
}

export function getAllReviews() {
  return cached(CONTENT_NAMESPACE, 'reviews:all', TTL_SECONDS, async (): Promise<ReviewContent[]> => {
    const rows = await db.select().from(storeReviews).orderBy(asc(storeReviews.sortOrder), asc(storeReviews.createdAt))
    return rows.map(({ id, author, body, sortOrder, isActive }) => ({ id, author, body, sortOrder, isActive }))
  })
}

export async function getHomeContent(): Promise<HomeContent> {
  const [banners, reviews, settings] = await Promise.all([getAllBanners(), getAllReviews(), getSettings()])
  return {
    banners: banners.filter((banner) => banner.isActive),
    reviews: reviews.filter((review) => review.isActive),
    headings: (settings.headings ?? {}) as HeadingSettings,
    seoSections: Array.isArray(settings.seo_sections) ? (settings.seo_sections as SeoSection[]) : [],
  }
}

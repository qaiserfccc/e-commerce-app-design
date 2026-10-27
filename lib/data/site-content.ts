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
const LEGACY_ANNOUNCEMENTS = [
  'Get exclusive discounts on top lens brands',
  'Delivery available all over Pakistan',
  'Hurry up and save now!',
  'Free delivery on orders over Rs 2500',
]
const LEGACY_FOOTER_ABOUT = 'Eye Lenses is a main online dispensary of contact lenses that serves all categories of users, ranging from occasional wearers to daily lens users.'
const LEGACY_FOOTER_BRANDS = ['Comfort', 'Bella', 'Optiano', 'Us Vision', 'Freshlook', 'Magic Eye', 'Dress Your Eye', 'Joli', 'Freshkon']
const LEGACY_FOOTER_COLLECTIONS = ['Luminous', 'Naturel', '3D Colors', 'Tinker Bell']
const LEGACY_FOOTER_EXPLORE = [
  ['Shop By Color', 'colored-lenses'],
  ['Shop By Diameter', 'shop-by-diameter-dia'],
  ['Shop By Disposibility', 'shop-by-disposability'],
  ['Deals', 'deals'],
  ['Accessories', 'accessories'],
  ['Transparent', 'transparent-lenses'],
]
const LEGACY_HERO_TITLES = new Set(['10.10 sale', 'Sunglasses collection', 'Shop now', 'Deals on contact lenses'])

function matchesStrings(value: string[] | undefined, expected: string[]) {
  return value?.length === expected.length && value.every((item, index) => item === expected[index])
}

function storefrontFooter(value: unknown): FooterSettings {
  const footer = { ...((value ?? {}) as FooterSettings) }
  if (footer.logo?.startsWith('https://eyelenses.pk/')) delete footer.logo
  if (footer.about === LEGACY_FOOTER_ABOUT) delete footer.about
  if (matchesStrings(footer.brands, LEGACY_FOOTER_BRANDS)) delete footer.brands
  if (matchesStrings(footer.collections, LEGACY_FOOTER_COLLECTIONS)) delete footer.collections
  if (JSON.stringify(footer.explore) === JSON.stringify(LEGACY_FOOTER_EXPLORE)) delete footer.explore
  return footer
}

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
      announcements: asStrings(settings.announcements).filter((item) => !LEGACY_ANNOUNCEMENTS.includes(item)),
      contact: (settings.contact ?? {}) as ContactSettings,
      footer: storefrontFooter(settings.footer),
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
  const [banners, settings] = await Promise.all([getAllBanners(), getSettings()])
  const headings = { ...((settings.headings ?? {}) as HeadingSettings) }
  if (headings.categoriesIntro === 'Browse through our extensive selection to find the perfect lens for you.') delete headings.categoriesIntro
  if (headings.serviceTitle === 'Professional Service') delete headings.serviceTitle
  if (headings.serviceBody === 'Enjoy fast and secure delivery across Pakistan your lenses, delivered safely to your doorstep!') delete headings.serviceBody
  if (headings.reviews === 'Customer Love Us') delete headings.reviews
  if (headings.reviewsIntro === 'Loved by customers for exceptional service and quality.') delete headings.reviewsIntro
  return {
    banners: banners.filter((banner) => banner.isActive && !banner.imageUrl.startsWith('https://eyelenses.pk/') && !(banner.placement === 'hero' && LEGACY_HERO_TITLES.has(banner.title))),
    headings,
    seoSections: Array.isArray(settings.seo_sections) ? (settings.seo_sections as SeoSection[]) : [],
  }
}

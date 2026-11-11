import 'server-only'

import { randomUUID } from 'node:crypto'
import { and, count, desc, eq, gte, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { storeActivityEvents, storeGrowthEvents, storeOrders, storeSettings } from '@/lib/db/schema'
import { getMetaLeadAdsSetupStatus } from '@/lib/server/meta-leads'
import { requireAdminSession } from '@/lib/auth/admin'

export type MarketingIntegrationConfig = {
  metaPixelId: string
  ga4MeasurementId: string
  gtmContainerId: string
  googleAdsConversionId: string
  googleAdsConversionLabel: string
  tiktokPixelId: string
}

export type CroAction = {
  id: string
  title: string
  hypothesis: string
  pagePath: string
  status: 'todo' | 'in_progress' | 'done'
  createdAt: string
}

const MARKETING_KEY = 'marketing_integrations'
const CRO_ACTIONS_KEY = 'cro_actions'

const emptyIntegrations: MarketingIntegrationConfig = {
  metaPixelId: '',
  ga4MeasurementId: '',
  gtmContainerId: '',
  googleAdsConversionId: '',
  googleAdsConversionLabel: '',
  tiktokPixelId: '',
}

const starterActions: Omit<CroAction, 'createdAt'>[] = [
  {
    id: 'baseline-funnel',
    title: 'Capture a consented storefront baseline',
    hypothesis: 'A complete funnel baseline will show which customer journey step needs attention first.',
    pagePath: '/shop',
    status: 'todo',
  },
  {
    id: 'mobile-product-review',
    title: 'Review product pages on a phone',
    hypothesis: 'Clear product details and a visible add-to-bag action can make comparison easier on smaller screens.',
    pagePath: '/product',
    status: 'todo',
  },
  {
    id: 'checkout-walkthrough',
    title: 'Walk through checkout as a new shopper',
    hypothesis: 'Checking every checkout step can uncover confusing fields or unexpected delivery details.',
    pagePath: '/checkout',
    status: 'todo',
  },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cleanString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function parseIntegrations(value: unknown): MarketingIntegrationConfig {
  const record = isRecord(value) ? value : {}
  return {
    metaPixelId: cleanString(record.metaPixelId, 30),
    ga4MeasurementId: cleanString(record.ga4MeasurementId, 24),
    gtmContainerId: cleanString(record.gtmContainerId, 24),
    googleAdsConversionId: cleanString(record.googleAdsConversionId, 32),
    googleAdsConversionLabel: cleanString(record.googleAdsConversionLabel, 120),
    tiktokPixelId: cleanString(record.tiktokPixelId, 80),
  }
}

export function validateMarketingIntegrations(value: unknown): MarketingIntegrationConfig {
  if (!isRecord(value)) throw new Error('Integration settings must be an object.')
  const allowedFields = new Set(Object.keys(emptyIntegrations))
  if (Object.keys(value).some((key) => !allowedFields.has(key))) {
    throw new Error('Only public provider IDs may be saved here; access tokens and secret fields are not accepted.')
  }
  const fieldLimits: Record<keyof MarketingIntegrationConfig, number> = {
    metaPixelId: 30,
    ga4MeasurementId: 24,
    gtmContainerId: 24,
    googleAdsConversionId: 32,
    googleAdsConversionLabel: 120,
    tiktokPixelId: 80,
  }
  for (const [field, maxLength] of Object.entries(fieldLimits) as Array<[keyof MarketingIntegrationConfig, number]>) {
    if (typeof value[field] !== 'string' || value[field].length > maxLength) {
      throw new Error(`${field} must be a string no longer than ${maxLength} characters.`)
    }
  }
  const config = parseIntegrations(value)
  const patterns: Array<[keyof MarketingIntegrationConfig, RegExp, string]> = [
    ['metaPixelId', /^\d{5,30}$/, 'Meta Pixel ID must contain 5–30 digits.'],
    ['ga4MeasurementId', /^G-[A-Z0-9]{4,20}$/i, 'GA4 Measurement ID must look like G-XXXXXXXXXX.'],
    ['gtmContainerId', /^GTM-[A-Z0-9]{4,20}$/i, 'Google Tag Manager ID must look like GTM-XXXXXXX.'],
    ['googleAdsConversionId', /^AW-\d{5,30}$/, 'Google Ads conversion ID must look like AW-123456789.'],
    ['tiktokPixelId', /^[A-Z0-9_-]{5,80}$/i, 'TikTok Pixel ID contains unsupported characters.'],
  ]
  for (const [field, pattern, message] of patterns) {
    const item = config[field]
    if (item && !pattern.test(item)) throw new Error(message)
  }
  if (config.googleAdsConversionLabel && !/^[A-Za-z0-9_-]{4,120}$/.test(config.googleAdsConversionLabel)) {
    throw new Error('Google Ads conversion label contains unsupported characters.')
  }
  if (Boolean(config.googleAdsConversionId) !== Boolean(config.googleAdsConversionLabel)) {
    throw new Error('Enter both the Google Ads conversion ID and conversion label, or leave both blank.')
  }
  if (config.gtmContainerId && (config.ga4MeasurementId || config.googleAdsConversionId)) {
    throw new Error('When using Google Tag Manager, leave direct GA4 and Google Ads IDs blank to avoid duplicate tags.')
  }
  return config
}

export async function getMarketingIntegrations() {
  const [setting] = await db.select({ value: storeSettings.value }).from(storeSettings).where(eq(storeSettings.key, MARKETING_KEY)).limit(1)
  return parseIntegrations(setting?.value)
}

export async function saveMarketingIntegrations(value: unknown) {
  const actor = await requireAdminSession('admin')
  const config = validateMarketingIntegrations(value)
  await db.transaction(async (tx) => {
    await tx.insert(storeSettings)
      .values({ key: MARKETING_KEY, value: config })
      .onConflictDoUpdate({ target: storeSettings.key, set: { value: config, updatedAt: new Date() } })
    await tx.insert(storeActivityEvents).values({
      entityType: 'setting',
      entityId: randomUUID(),
      eventType: 'marketing_integrations_updated',
      payload: { adminUserId: actor.userId, configuredProviders: Object.entries(config).filter(([key, value]) => value && key !== 'googleAdsConversionLabel').map(([key]) => key) },
    })
  })
  return config
}

export async function getCroActionList(): Promise<CroAction[]> {
  const [setting] = await db.select({ value: storeSettings.value }).from(storeSettings).where(eq(storeSettings.key, CRO_ACTIONS_KEY)).limit(1)
  if (!Array.isArray(setting?.value)) {
    const createdAt = new Date().toISOString()
    return starterActions.map((action) => ({ ...action, createdAt }))
  }
  return setting.value.filter((value): value is CroAction => isRecord(value) &&
    typeof value.id === 'string' && typeof value.title === 'string' &&
    typeof value.hypothesis === 'string' && typeof value.pagePath === 'string' &&
    (value.status === 'todo' || value.status === 'in_progress' || value.status === 'done') &&
    typeof value.createdAt === 'string').slice(0, 100)
}

export function validateCroActions(value: unknown): CroAction[] {
  if (!Array.isArray(value) || value.length > 100) throw new Error('CRO actions must be a list of no more than 100 items.')
  const seen = new Set<string>()
  return value.map((item) => {
    if (!isRecord(item)) throw new Error('Each CRO action must be an object.')
    const allowedFields = new Set(['id', 'title', 'hypothesis', 'pagePath', 'status', 'createdAt'])
    if (Object.keys(item).some((key) => !allowedFields.has(key))) throw new Error('CRO actions may not include additional fields.')
    if (typeof item.id !== 'string' || item.id.length > 80 ||
        typeof item.title !== 'string' || item.title.length > 120 ||
        typeof item.hypothesis !== 'string' || item.hypothesis.length > 500 ||
        typeof item.pagePath !== 'string' || item.pagePath.length > 300 ||
        typeof item.createdAt !== 'string' || item.createdAt.length > 40) {
      throw new Error('CRO action fields must be strings within their allowed lengths.')
    }
    const id = cleanString(item.id, 80)
    const title = cleanString(item.title, 120)
    const hypothesis = cleanString(item.hypothesis, 500)
    const pagePath = cleanString(item.pagePath, 300)
    const status = item.status
    const createdAt = cleanString(item.createdAt, 40)
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id) || seen.has(id)) throw new Error('CRO action IDs must be unique and valid.')
    if (!title || !hypothesis || !/^\/(?!\/)[^\s?#]*$/.test(pagePath)) throw new Error('Each action needs a title, hypothesis, and local page path.')
    if (status !== 'todo' && status !== 'in_progress' && status !== 'done') throw new Error('CRO action status is invalid.')
    const parsedDate = new Date(createdAt)
    if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString() !== createdAt) {
      throw new Error('CRO action date must be a canonical ISO timestamp.')
    }
    seen.add(id)
    return { id, title, hypothesis, pagePath, status, createdAt }
  })
}

export async function saveCroActions(value: unknown) {
  const actor = await requireAdminSession('admin')
  const actions = validateCroActions(value)
  await db.transaction(async (tx) => {
    await tx.insert(storeSettings)
      .values({ key: CRO_ACTIONS_KEY, value: actions })
      .onConflictDoUpdate({ target: storeSettings.key, set: { value: actions, updatedAt: new Date() } })
    await tx.insert(storeActivityEvents).values({
      entityType: 'setting',
      entityId: randomUUID(),
      eventType: 'cro_actions_updated',
      payload: { adminUserId: actor.userId, actionCount: actions.length },
    })
  })
  return actions
}

export async function getCroMetrics(days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const [eventRows, dailyRows, topPageRows, orderRows] = await Promise.all([
    db.select({
      eventName: storeGrowthEvents.eventName,
      eventCount: count(),
      sessions: sql<number>`count(distinct ${storeGrowthEvents.sessionId})::int`,
      value: sql<string>`coalesce(sum(${storeGrowthEvents.value}), 0)::text`,
    }).from(storeGrowthEvents)
      .where(gte(storeGrowthEvents.createdAt, since))
      .groupBy(storeGrowthEvents.eventName),
    db.select({
      day: sql<string>`to_char(date_trunc('day', ${storeGrowthEvents.createdAt}), 'YYYY-MM-DD')`,
      pageViews: count(),
      sessions: sql<number>`count(distinct ${storeGrowthEvents.sessionId})::int`,
    }).from(storeGrowthEvents)
      .where(and(gte(storeGrowthEvents.createdAt, since), eq(storeGrowthEvents.eventName, 'page_view')))
      .groupBy(sql`date_trunc('day', ${storeGrowthEvents.createdAt})`)
      .orderBy(sql`date_trunc('day', ${storeGrowthEvents.createdAt})`),
    db.select({
      pagePath: storeGrowthEvents.pagePath,
      views: count(),
      sessions: sql<number>`count(distinct ${storeGrowthEvents.sessionId})::int`,
    }).from(storeGrowthEvents)
      .where(and(gte(storeGrowthEvents.createdAt, since), eq(storeGrowthEvents.eventName, 'page_view')))
      .groupBy(storeGrowthEvents.pagePath)
      .orderBy(desc(count()))
      .limit(10),
    db.select({ count: count() }).from(storeOrders).where(gte(storeOrders.createdAt, since)),
  ])
  const eventSummary = Object.fromEntries(eventRows.map((row) => [row.eventName, {
    count: Number(row.eventCount),
    sessions: Number(row.sessions),
    value: row.value,
  }]))
  return {
    days,
    since: since.toISOString(),
    events: eventSummary,
    dailyPageViews: dailyRows.map((row) => ({ day: row.day, pageViews: Number(row.pageViews), sessions: Number(row.sessions) })),
    topPages: topPageRows.map((row) => ({ pagePath: row.pagePath, views: Number(row.views), sessions: Number(row.sessions) })),
    orders: Number(orderRows[0]?.count ?? 0),
  }
}

export async function getMarketingIntegrationStatus() {
  const config = await getMarketingIntegrations()
  const metaLeadAds = getMetaLeadAdsSetupStatus()
  return {
    config,
    metaLeadAds,
  }
}

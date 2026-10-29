import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

const graphVersionPattern = /^v\d{1,3}\.\d{1,2}$/

function configuredSecret(name: string) {
  const value = process.env[name]?.trim() ?? ''
  return /^(REPLACE_ME|YOUR_|CHANGE_ME|PLACEHOLDER)/i.test(value) ? '' : value
}

export class MetaWebhookError extends Error {
  constructor(message: string, readonly status: 400 | 401 | 403 | 413 | 502 | 503) {
    super(message)
    this.name = 'MetaWebhookError'
  }
}

export function getMetaLeadAdsConfiguration() {
  const graphApiVersion = process.env.META_GRAPH_API_VERSION?.trim() ?? ''
  const pageId = process.env.META_PAGE_ID?.trim() ?? ''
  return {
    appSecret: configuredSecret('META_APP_SECRET'),
    pageAccessToken: configuredSecret('META_PAGE_ACCESS_TOKEN'),
    pageId: /^\d{1,40}$/.test(pageId) ? pageId : '',
    verifyToken: configuredSecret('META_WEBHOOK_VERIFY_TOKEN'),
    graphApiVersion: graphApiVersion && graphVersionPattern.test(graphApiVersion) ? graphApiVersion : '',
  }
}

export function getMetaLeadAdsSetupStatus() {
  const config = getMetaLeadAdsConfiguration()
  const missing: string[] = []
  if (!config.appSecret) missing.push('META_APP_SECRET')
  if (!config.pageAccessToken) missing.push('META_PAGE_ACCESS_TOKEN')
  if (!config.pageId) missing.push('META_PAGE_ID')
  if (!config.verifyToken) missing.push('META_WEBHOOK_VERIFY_TOKEN')
  if (!config.graphApiVersion) missing.push('META_GRAPH_API_VERSION')
  return { configured: missing.length === 0, missing }
}

function constantTimeEqual(left: string, right: string) {
  const leftBytes = Buffer.from(left)
  const rightBytes = Buffer.from(right)
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes)
}

export function verifyMetaSignature(body: Buffer, signature: string | null, appSecret: string) {
  if (!signature || !/^sha256=[a-f0-9]{64}$/i.test(signature)) return false
  const expected = `sha256=${createHmac('sha256', appSecret).update(body).digest('hex')}`
  return constantTimeEqual(signature.toLowerCase(), expected)
}

type MetaLeadRecord = {
  id: string
  created_time?: string
  field_data?: Array<{ name?: string; values?: unknown[] }>
  form_id?: string
  ad_id?: string
}

function normalizeLeadFieldData(fields: MetaLeadRecord['field_data']) {
  const answers = new Map<string, string>()
  for (const field of fields ?? []) {
    if (typeof field.name !== 'string' || !Array.isArray(field.values)) continue
    const value = field.values.find((item) => typeof item === 'string')
    if (typeof value === 'string') answers.set(field.name.toLowerCase().replace(/[^a-z0-9]/g, ''), value.trim().slice(0, 254))
  }
  const firstName = answers.get('firstname') ?? answers.get('first_name')
  const lastName = answers.get('lastname') ?? answers.get('last_name')
  const name = answers.get('fullname') ?? answers.get('name') ?? [firstName, lastName].filter(Boolean).join(' ')
  const email = answers.get('email')
  const phone = answers.get('phone') ?? answers.get('phonenumber') ?? answers.get('mobilephone')
  return {
    fullName: name?.slice(0, 180) || null,
    email: email && email.length <= 254 ? email.toLowerCase() : null,
    phone: phone?.slice(0, 80) || null,
  }
}

async function fetchMetaLead(leadId: string, config: ReturnType<typeof getMetaLeadAdsConfiguration>) {
  const url = new URL(`https://graph.facebook.com/${config.graphApiVersion}/${encodeURIComponent(leadId)}`)
  url.searchParams.set('fields', 'id,created_time,field_data,form_id,ad_id')
  let response: Response
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${config.pageAccessToken}` },
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    })
  } catch {
    throw new MetaWebhookError('Meta could not be reached to retrieve the submitted lead.', 502)
  }
  if (!response.ok) {
    throw new MetaWebhookError('Meta could not provide the submitted lead details.', 502)
  }
  const declaredLength = Number(response.headers.get('content-length') ?? '0')
  if (declaredLength > 64 * 1024 || !response.body) {
    throw new MetaWebhookError('Meta returned an invalid lead response size.', 502)
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let byteLength = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    byteLength += value.byteLength
    if (byteLength > 64 * 1024) {
      await reader.cancel()
      throw new MetaWebhookError('Meta returned an invalid lead response size.', 502)
    }
    chunks.push(value)
  }
  const responseText = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf8')
  let result: unknown
  try {
    result = JSON.parse(responseText)
  } catch {
    throw new MetaWebhookError('Meta returned an invalid lead response.', 502)
  }
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new MetaWebhookError('Meta returned an invalid lead response.', 502)
  }
  const record = result as MetaLeadRecord
  if (record.id !== leadId || !Array.isArray(record.field_data)) {
    throw new MetaWebhookError('Meta returned incomplete lead details.', 502)
  }
  return { record, contact: normalizeLeadFieldData(record.field_data) }
}

export type MetaLeadEvent = {
  leadId: string
  pageId: string
  formId: string | null
  adId: string | null
  campaignId: string | null
}

export function parseMetaLeadEvents(payload: unknown, configuredPageId: string): MetaLeadEvent[] {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new MetaWebhookError('Webhook body must be a JSON object.', 400)
  }
  const body = payload as { object?: unknown; entry?: unknown }
  if (body.object !== 'page' || !Array.isArray(body.entry) || body.entry.length > 20) {
    throw new MetaWebhookError('Webhook body is not a supported page lead event.', 400)
  }
  const events: MetaLeadEvent[] = []
  for (const entryValue of body.entry) {
    if (!entryValue || typeof entryValue !== 'object' || Array.isArray(entryValue)) continue
    const entry = entryValue as { id?: unknown; changes?: unknown }
    if (typeof entry.id !== 'string' || entry.id !== configuredPageId) {
      throw new MetaWebhookError('Webhook page does not match the configured Meta page.', 403)
    }
    if (!Array.isArray(entry.changes)) continue
    for (const changeValue of entry.changes) {
      if (!changeValue || typeof changeValue !== 'object' || Array.isArray(changeValue)) continue
      const change = changeValue as { field?: unknown; value?: unknown }
      if (change.field !== 'leadgen') continue
      if (!change.value || typeof change.value !== 'object' || Array.isArray(change.value)) continue
      const value = change.value as Record<string, unknown>
      if (typeof value.leadgen_id !== 'string' || !/^\d{1,40}$/.test(value.leadgen_id)) {
        throw new MetaWebhookError('Webhook lead event is missing a valid lead ID.', 400)
      }
      if (value.page_id !== undefined && value.page_id !== entry.id) {
        throw new MetaWebhookError('Webhook lead event does not match its page entry.', 403)
      }
      const optionalId = (field: unknown) =>
        typeof field === 'string' && /^\d{1,40}$/.test(field) ? field : null
      events.push({
        leadId: value.leadgen_id,
        pageId: entry.id,
        formId: optionalId(value.form_id),
        adId: optionalId(value.ad_id),
        campaignId: optionalId(value.campaign_id),
      })
      if (events.length > 20) throw new MetaWebhookError('Webhook contains too many lead events.', 413)
    }
  }
  return events
}

export async function resolveMetaLead(event: MetaLeadEvent) {
  const config = getMetaLeadAdsConfiguration()
  const { record, contact } = await fetchMetaLead(event.leadId, config)
  return {
    ...contact,
    metaLeadId: event.leadId,
    metaPageId: event.pageId,
    metaFormId: event.formId ?? record.form_id ?? null,
    metaAdId: event.adId ?? record.ad_id ?? null,
    metaCampaignId: event.campaignId,
  }
}

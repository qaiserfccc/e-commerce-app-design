import { timingSafeEqual } from 'node:crypto'
import { eq, sql } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { storeCrmLeads, storeCustomers } from '@/lib/db/schema'
import {
  getMetaLeadAdsConfiguration,
  MetaWebhookError,
  parseMetaLeadEvents,
  resolveMetaLead,
  verifyMetaSignature,
} from '@/lib/server/meta-leads'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60
const maxRequestBytes = 256 * 1024

async function readBoundedBody(request: NextRequest) {
  const reader = request.body?.getReader()
  if (!reader) return Buffer.alloc(0)
  const chunks: Uint8Array[] = []
  let byteLength = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))
    byteLength += value.byteLength
    if (byteLength > maxRequestBytes) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
}

export async function GET(request: NextRequest) {
  const config = getMetaLeadAdsConfiguration()
  if (!config.verifyToken) {
    return NextResponse.json({ error: 'Meta webhook verification is not configured.' }, { status: 503 })
  }
  const mode = request.nextUrl.searchParams.get('hub.mode')
  const token = request.nextUrl.searchParams.get('hub.verify_token')
  const challenge = request.nextUrl.searchParams.get('hub.challenge')
  if (mode !== 'subscribe' || !token || token.length > 512 || !challenge || challenge.length > 200) {
    return NextResponse.json({ error: 'Invalid Meta webhook verification request.' }, { status: 400 })
  }
  const tokenBytes = Buffer.from(token)
  const expectedBytes = Buffer.from(config.verifyToken)
  if (tokenBytes.length !== expectedBytes.length || !timingSafeEqual(tokenBytes, expectedBytes)) {
    return NextResponse.json({ error: 'Meta webhook verification token is invalid.' }, { status: 403 })
  }
  return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  const config = getMetaLeadAdsConfiguration()
  if (!config.appSecret || !config.pageAccessToken || !config.pageId || !config.graphApiVersion) {
    return NextResponse.json({ error: 'Meta lead ingestion is not fully configured.' }, { status: 503 })
  }
  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase()
  if (contentType !== 'application/json') {
    return NextResponse.json({ error: 'Webhook requests must use application/json.' }, { status: 415 })
  }
  const contentLength = Number(request.headers.get('content-length') ?? '0')
  if (contentLength > maxRequestBytes) {
    return NextResponse.json({ error: 'Webhook body is too large.' }, { status: 413 })
  }
  const body = await readBoundedBody(request)
  if (!body) {
    return NextResponse.json({ error: 'Webhook body is too large.' }, { status: 413 })
  }
  if (!verifyMetaSignature(body, request.headers.get('x-hub-signature-256'), config.appSecret)) {
    return NextResponse.json({ error: 'Webhook signature is invalid.' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(body.toString('utf8'))
  } catch {
    return NextResponse.json({ error: 'Webhook body is not valid JSON.' }, { status: 400 })
  }

  try {
    const events = parseMetaLeadEvents(payload, config.pageId)
    let imported = 0
    let duplicates = 0
    for (let index = 0; index < events.length; index += 5) {
      const outcomes = await Promise.all(events.slice(index, index + 5).map(async (event) => {
        const [existing] = await db.select({ id: storeCrmLeads.id })
          .from(storeCrmLeads)
          .where(eq(storeCrmLeads.metaLeadId, event.leadId))
          .limit(1)
        if (existing) return 'duplicate'

        const lead = await resolveMetaLead(event)
        const [customer] = lead.email
          ? await db.select({ id: storeCustomers.id })
              .from(storeCustomers)
              .where(sql`lower(${storeCustomers.email}) = ${lead.email}`)
              .limit(1)
          : []
        const [inserted] = await db.insert(storeCrmLeads).values({
          ...lead,
          source: 'meta',
          status: 'new',
          matchedCustomerId: customer?.id ?? null,
        }).onConflictDoNothing().returning({ id: storeCrmLeads.id })
        return inserted ? 'imported' : 'duplicate'
      }))
      imported += outcomes.filter((outcome) => outcome === 'imported').length
      duplicates += outcomes.filter((outcome) => outcome === 'duplicate').length
    }
    return NextResponse.json({ received: events.length, imported, duplicates }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof MetaWebhookError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } })
    }
    console.error('[meta-leads-webhook] Processing failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'Meta lead event processing failed. Meta may retry this event.' }, { status: 500 })
  }
}

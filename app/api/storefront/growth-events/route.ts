import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { storeGrowthEvents } from '@/lib/db/schema'
import { consumePublicRateLimit } from '@/lib/auth/public-rate-limit'
import { isSameOriginOrNativeRequest } from '@/lib/http/api-origin'
import { JsonBodyError, readJsonBody } from '@/lib/http/json-body'
import { sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const eventNames = new Set(['page_view', 'view_item', 'add_to_cart', 'begin_checkout', 'purchase'])
const acceptedFields = new Set(['eventId', 'sessionId', 'consentGranted', 'eventName', 'pagePath', 'productId', 'value', 'currency'])

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  if (!request.headers.get('origin') || !isSameOriginOrNativeRequest(request)) {
    return response({ error: 'Growth events are accepted only from the same-origin storefront.' }, 403)
  }
  const address = request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() || 'unknown'
  if (!consumePublicRateLimit('growth-events', address, 120, 60_000)) {
    return response({ error: 'Too many analytics events.' }, 429)
  }
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return response({ error: 'Expected a JSON event.' }, 415)
  }
  try {
    const body = await readJsonBody(request, 2048)
    if (!body || typeof body !== 'object' || Array.isArray(body)) return response({ error: 'Invalid analytics event.' }, 400)
    const input = body as Record<string, unknown>
    const pagePath = input.pagePath
    const eventName = input.eventName
    const eventId = input.eventId
    const sessionId = input.sessionId
    if (input.consentGranted !== true ||
      typeof eventId !== 'string' || !uuidV4.test(eventId) ||
      typeof sessionId !== 'string' || !uuidV4.test(sessionId) ||
      typeof eventName !== 'string' || !eventNames.has(eventName) ||
      typeof pagePath !== 'string' || pagePath.length > 300 ||
      !/^\/(?!\/)[^\s?#]*$/.test(pagePath)) {
      return response({ error: 'Analytics event fields are invalid.' }, 400)
    }
    if (Object.keys(input).some((key) => !acceptedFields.has(key))) {
      return response({ error: 'Analytics events may not include additional fields.' }, 400)
    }

    let productId: string | null = null
    if (input.productId !== undefined && input.productId !== null) {
      if (typeof input.productId !== 'string' || !uuidV4.test(input.productId)) {
        return response({ error: 'Product ID is invalid.' }, 400)
      }
      productId = input.productId
    }

    let value: string | null = null
    let currency: string | null = null
    if (input.value !== undefined) {
      if (typeof input.value !== 'number' || !Number.isFinite(input.value) || input.value < 0 || input.value > 100_000_000) {
        return response({ error: 'Event value is invalid.' }, 400)
      }
      value = input.value.toFixed(2)
    }
    if (input.currency !== undefined) {
      if (typeof input.currency !== 'string' || !/^[A-Z]{3}$/.test(input.currency)) {
        return response({ error: 'Event currency is invalid.' }, 400)
      }
      currency = input.currency
    }

    await db.insert(storeGrowthEvents).values({
      eventId,
      sessionId,
      eventName,
      pagePath,
      productId,
      value,
      currency,
    }).onConflictDoNothing()

    await db.execute(sql`
      DELETE FROM public.store_growth_events
      WHERE event_id IN (
        SELECT event_id
        FROM public.store_growth_events
        WHERE created_at < now() - interval '90 days'
        ORDER BY created_at
        LIMIT 1000
      )
    `)
    return response({ accepted: true }, 202)
  } catch (error) {
    if (error instanceof JsonBodyError) return response({ error: error.message }, error.status)
    console.error('[growth-events] Could not store analytics event', error instanceof Error ? error.name : 'UnknownError')
    return response({ error: 'Analytics event could not be recorded.' }, 500)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { submitCodOrder, CheckoutError } from '@/app/actions/checkout'
import {
  CustomerAuthError,
  ensureCustomerSessionSigningConfigured,
  setOrderReceipt,
} from '@/lib/auth/store-customer'
import { consumePublicRateLimit } from '@/lib/auth/public-rate-limit'
import { JsonBodyError, readJsonBody } from '@/lib/http/json-body'

export const dynamic = 'force-dynamic'

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

function clientAddress(request: NextRequest) {
  return request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ||
    'unknown'
}

function errorResponse(error: unknown) {
  if (error instanceof CheckoutError || error instanceof CustomerAuthError) {
    return response({ error: error.message }, error.status)
  }
  if (error instanceof JsonBodyError) return response({ error: error.message }, error.status)
  console.error('[checkout] Order submission failed', error instanceof Error ? error.name : 'UnknownError')
  return response({ error: 'The order could not be placed. Your bag is unchanged; try again shortly.' }, 500)
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin) {
    return response({ error: 'This order request was not accepted.' }, 403)
  }
  if (!consumePublicRateLimit('checkout', clientAddress(request), 6, 15 * 60 * 1000)) {
    return response({ error: 'Too many order attempts. Wait a few minutes and try again.' }, 429)
  }
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return response({ error: 'Order details must be sent as JSON.' }, 415)
  }
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > 32_768) return response({ error: 'The order request is too large.' }, 413)

  try {
    await ensureCustomerSessionSigningConfigured()
    const body = await readJsonBody(request, 32_768)
    const order = await submitCodOrder(body)
    await setOrderReceipt(order.id)
    return response({
      orderNumber: order.orderNumber,
      reused: order.reused,
    }, 201)
  } catch (error) {
    return errorResponse(error)
  }
}

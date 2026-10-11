import { NextRequest, NextResponse } from 'next/server'
import {
  clearCustomerSession,
  createCustomerSession,
  CustomerAuthError,
  ensureCustomerSessionSigningConfigured,
  getCustomerSession,
  registerStoreCustomer,
  verifyStoreCustomerCredentials,
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

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')
  return Boolean(origin && origin === new URL(request.url).origin)
}

function knownError(error: unknown) {
  if (error instanceof CustomerAuthError) return response({ error: error.message }, error.status)
  if (error instanceof JsonBodyError) return response({ error: error.message }, error.status)
  console.error('[customer-auth] Request failed', error instanceof Error ? error.name : 'UnknownError')
  return response({ error: 'Account access is temporarily unavailable. Try again shortly.' }, 500)
}

export async function GET() {
  try {
    const customer = await getCustomerSession()
    return response({ customer: customer ? { email: customer.email } : null })
  } catch (error) {
    return knownError(error)
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return response({ error: 'This account request was not accepted.' }, 403)
  if (!consumePublicRateLimit('customer-auth', clientAddress(request), 10, 15 * 60 * 1000)) {
    return response({ error: 'Too many account attempts. Wait a few minutes and try again.' }, 429)
  }
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return response({ error: 'Account details must be sent as JSON.' }, 415)
  }
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > 16_384) return response({ error: 'The account request is too large.' }, 413)

  try {
    const body = await readJsonBody(request, 16_384)
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return response({ error: 'Account details are invalid.' }, 400)
    }
    const details = body as Record<string, unknown>
    if (details.action === 'logout') {
      await clearCustomerSession()
      return response({ customer: null })
    }
    ensureCustomerSessionSigningConfigured()
    if (details.action === 'register') {
      const customer = await registerStoreCustomer(details.email, details.password)
      await createCustomerSession(customer)
      return response({ customer: { email: customer.email } }, 201)
    }
    if (details.action === 'login') {
      const customer = await verifyStoreCustomerCredentials(details.email, details.password)
      if (!customer) return response({ error: 'Email or password is incorrect.' }, 401)
      await createCustomerSession(customer)
      return response({ customer: { email: customer.email } })
    }
    return response({ error: 'Choose sign in, create an account, or sign out.' }, 400)
  } catch (error) {
    return knownError(error)
  }
}

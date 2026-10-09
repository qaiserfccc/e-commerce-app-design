import { NextRequest, NextResponse } from 'next/server'
import {
  beginIskCatalogReplacement,
  importIskCatalogPage,
} from '@/app/actions/admin'
import { adminApiError } from '@/lib/auth/admin-api'
import { requireAdminSession } from '@/lib/auth/admin'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (
    request.headers.get('origin') !== request.nextUrl.origin ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  ) {
    return NextResponse.json({ error: 'Cross-origin import requests are not allowed.' }, { status: 403 })
  }

  try {
    await requireAdminSession('admin')
    const contentLength = Number(request.headers.get('content-length') ?? 0)
    if (contentLength > 512) return NextResponse.json({ error: 'Import request is too large.' }, { status: 413 })
    let payload: unknown
    try {
      payload = await request.json()
    } catch {
      return NextResponse.json({ error: 'Import request must contain valid JSON.' }, { status: 400 })
    }
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload) || !('action' in payload)) {
      return NextResponse.json({ error: 'Import action is invalid.' }, { status: 400 })
    }

    if (payload.action === 'begin') {
      return NextResponse.json(
        { data: await beginIskCatalogReplacement() },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }
    if (
      payload.action !== 'page' ||
      !('runId' in payload) || typeof payload.runId !== 'string' ||
      !('page' in payload) || typeof payload.page !== 'number'
    ) {
      return NextResponse.json({ error: 'Import page details are invalid.' }, { status: 400 })
    }
    return NextResponse.json(
      { data: await importIskCatalogPage(payload.runId, payload.page) },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return adminApiError(error)
  }
}

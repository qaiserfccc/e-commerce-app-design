import { NextRequest, NextResponse } from 'next/server'
import { invalidateCache } from '@/lib/cache'
import { requireAdminSession } from '@/lib/auth/admin'
import { adminApiError } from '@/lib/auth/admin-api'
import { isSameOriginOrNativeRequest } from '@/lib/http/api-origin'
import { syncIskCatalog, type CatalogSyncEntity } from '@/lib/server/isk-catalog-sync.mjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const entities = new Set<CatalogSyncEntity>(['products', 'brands', 'categories', 'lens-shades', 'lens-types', 'all'])

export async function POST(request: NextRequest) {
  if (!isSameOriginOrNativeRequest(request)) {
    return NextResponse.json({ error: 'Cross-origin sync requests are not allowed.' }, { status: 403 })
  }

  try {
    await requireAdminSession('admin')
    const body: unknown = await request.json()
    if (typeof body !== 'object' || body === null || !('entity' in body) ||
        typeof body.entity !== 'string' || !entities.has(body.entity as CatalogSyncEntity)) {
      return NextResponse.json({ error: 'Choose products, brands, categories, lens shades, lens types, or all.' }, { status: 400 })
    }
    const result = await syncIskCatalog(body.entity as CatalogSyncEntity)
    invalidateCache('catalog')
    invalidateCache('content')
    return NextResponse.json({ data: result }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return adminApiError(error)
  }
}

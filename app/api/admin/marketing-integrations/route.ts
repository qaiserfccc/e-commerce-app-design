import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth/admin'
import { adminApiError } from '@/lib/auth/admin-api'
import { adminApiFailure, readAdminJson } from '@/lib/http/admin-route'
import { getMarketingIntegrationStatus, saveMarketingIntegrations } from '@/lib/server/cro'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdminSession()
    return NextResponse.json({ data: await getMarketingIntegrationStatus() }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    return adminApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdminSession('admin')
    const body = await readAdminJson(request)
    return NextResponse.json({ data: await saveMarketingIntegrations(body) }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    return adminApiFailure(error)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth/admin'
import { adminApiError } from '@/lib/auth/admin-api'
import { AdminRequestError } from '@/lib/http/admin-request-error'
import { adminApiFailure, readAdminJson } from '@/lib/http/admin-route'
import { getCroActionList, saveCroActions } from '@/lib/server/cro'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdminSession()
    return NextResponse.json({ data: await getCroActionList() }, {
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
    if (Object.keys(body).some((key) => key !== 'actions')) {
      throw new AdminRequestError('Only the actions field is accepted.', 400)
    }
    return NextResponse.json({ data: await saveCroActions(body.actions) }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    return adminApiFailure(error)
  }
}

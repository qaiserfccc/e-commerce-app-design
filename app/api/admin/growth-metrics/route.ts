import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth/admin'
import { adminApiError } from '@/lib/auth/admin-api'
import { getCroMetrics } from '@/lib/server/cro'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdminSession()
    const rawDays = new URL(request.url).searchParams.get('days') ?? '30'
    if (!/^(7|30|90)$/.test(rawDays)) {
      return NextResponse.json({ error: 'Choose a 7, 30, or 90 day reporting period.' }, { status: 400 })
    }
    return NextResponse.json({ data: await getCroMetrics(Number(rawDays)) }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    return adminApiError(error)
  }
}

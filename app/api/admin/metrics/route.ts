import { NextRequest, NextResponse } from 'next/server'
import { getDashboardMetrics } from '@/app/actions/admin'
import { adminApiError } from '@/lib/auth/admin-api'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const metrics = await getDashboardMetrics()

    return NextResponse.json(
      {
        data: metrics,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      },
    )
  } catch (error) {
    return adminApiError(error)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getDashboardMetrics } from '@/app/actions/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // TODO: Add auth check here when auth is implemented
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
    console.error('[v0] Metrics API error:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
}

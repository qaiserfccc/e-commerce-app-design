import { NextResponse } from 'next/server'
import { getMarketingIntegrations } from '@/lib/server/cro'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const config = await getMarketingIntegrations()
    return NextResponse.json({ data: config }, {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
    })
  } catch (error) {
    console.error('[tracking-config] Could not load public provider IDs', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'Tracking configuration is temporarily unavailable.' }, {
      status: 500,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}

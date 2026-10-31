import { NextResponse } from 'next/server'
import { getStorefrontLensTypes } from '@/lib/data/catalog'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json(
      { data: await getStorefrontLensTypes() },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } },
    )
  } catch (error) {
    console.error('[lens-types-api] Lens type request failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'Failed to fetch lens types' }, { status: 500 })
  }
}

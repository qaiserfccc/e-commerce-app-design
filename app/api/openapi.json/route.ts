import { NextResponse } from 'next/server'
import specification from '@/openapi.json'

export const dynamic = 'force-static'

export async function GET() {
  return NextResponse.json(specification, {
    headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' },
  })
}

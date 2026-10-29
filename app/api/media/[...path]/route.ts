import { NextRequest, NextResponse } from 'next/server'
import { mediaPathFromOwnedUrl, readMedia } from '@/lib/server/media-storage.mjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function serve(request: NextRequest, path: string[]) {
  const pathname = mediaPathFromOwnedUrl(`/api/media/${path.join('/')}`)
  if (!pathname) return new NextResponse(null, { status: 404 })

  try {
    const media = await readMedia(pathname)
    if (!media) return new NextResponse(null, {
      status: 404,
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
    })

    const etag = `"${media.etag}"`
    if (request.headers.get('if-none-match')?.split(',').some((value) => value.trim() === etag)) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
        },
      })
    }

    return new NextResponse(media.content, {
      headers: {
        'Content-Type': media.content_type,
        'Content-Length': String(media.byte_length),
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
        ETag: etag,
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('[media] Delivery failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json(
      { error: 'Media delivery is temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  return serve(request, path)
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const response = await serve(request, path)
  return new NextResponse(null, { status: response.status, headers: response.headers })
}

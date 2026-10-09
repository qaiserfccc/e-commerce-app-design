import { del } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { deleteProductAsset, getProductAssetById, moveProductAsset } from '@/app/actions/admin'
import { requireAdminSession } from '@/lib/auth/admin'
import { adminApiError } from '@/lib/auth/admin-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function sameOrigin(request: NextRequest) {
  return request.headers.get('origin') === request.nextUrl.origin &&
    request.headers.get('sec-fetch-site') !== 'cross-site'
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-origin delete requests are not allowed.' }, { status: 403 })
  }

  try {
    await requireAdminSession('admin')
    const { assetId } = await params
    const asset = await getProductAssetById(assetId)
    if (!asset) return NextResponse.json({ error: 'Product media not found.' }, { status: 404 })

    if (asset.blobUrl) {
      const url = new URL(asset.blobUrl)
      if (url.protocol !== 'https:' || !url.hostname.endsWith('.blob.vercel-storage.com')) {
        return NextResponse.json({ error: 'Stored media URL is not a valid Vercel Blob URL.' }, { status: 409 })
      }
      await del(url.toString())
    }
    await deleteProductAsset(assetId)
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return adminApiError(error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-origin media requests are not allowed.' }, { status: 403 })
  }
  try {
    await requireAdminSession('admin')
    const { assetId } = await params
    let payload: unknown
    try {
      payload = await request.json()
    } catch {
      return NextResponse.json({ error: 'Media order request is invalid.' }, { status: 400 })
    }
    if (
      typeof payload !== 'object' ||
      payload === null ||
      Array.isArray(payload) ||
      !('direction' in payload) ||
      (payload.direction !== 'up' && payload.direction !== 'down')
    ) {
      return NextResponse.json({ error: 'Media direction is invalid.' }, { status: 400 })
    }
    const asset = await moveProductAsset(assetId, payload.direction)
    return NextResponse.json({ data: asset }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return adminApiError(error)
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { deleteProductAsset, getProductAssetById, moveProductAsset } from '@/app/actions/admin'
import { requireAdminSession } from '@/lib/auth/admin'
import { adminApiError } from '@/lib/auth/admin-api'
import { isSameOriginOrNativeRequest } from '@/lib/http/api-origin'
import { deleteMedia, mediaPathFromOwnedUrl } from '@/lib/server/media-storage.mjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
) {
  if (!isSameOriginOrNativeRequest(request)) {
    return NextResponse.json({ error: 'Cross-origin delete requests are not allowed.' }, { status: 403 })
  }

  try {
    await requireAdminSession('admin')
    const { assetId } = await params
    const asset = await getProductAssetById(assetId)
    if (!asset) return NextResponse.json({ error: 'Product media not found.' }, { status: 404 })

    const pathname = mediaPathFromOwnedUrl(asset.blobUrl)
    if (pathname) await deleteMedia(pathname)
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
  if (!isSameOriginOrNativeRequest(request)) {
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

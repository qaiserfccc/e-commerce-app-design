import { del } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { deleteProductAsset, getProductAssetById } from '@/app/actions/admin'
import { requireAdminSession } from '@/lib/auth/admin'
import { adminApiError } from '@/lib/auth/admin-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
) {
  if (
    request.headers.get('origin') !== request.nextUrl.origin ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  ) {
    return NextResponse.json({ error: 'Cross-origin delete requests are not allowed.' }, { status: 403 })
  }

  try {
    await requireAdminSession()
    const { assetId } = await params
    const asset = await getProductAssetById(assetId)
    if (!asset) return NextResponse.json({ error: 'Product image not found.' }, { status: 404 })

    if (asset.blobUrl) {
      const url = new URL(asset.blobUrl)
      if (url.protocol !== 'https:' || !url.hostname.endsWith('.blob.vercel-storage.com')) {
        return NextResponse.json({ error: 'Stored image URL is not a valid Vercel Blob URL.' }, { status: 409 })
      }
      await del(url.toString())
    }
    await deleteProductAsset(assetId)
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return adminApiError(error)
  }
}

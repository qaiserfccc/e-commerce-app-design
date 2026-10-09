import { randomUUID } from 'node:crypto'
import { del, put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { addProductAsset, getAdminProduct } from '@/app/actions/admin'
import { requireAdminSession } from '@/lib/auth/admin'
import { adminApiError } from '@/lib/auth/admin-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const acceptedMediaTypes = new Map<string, { extension: string; mediaType: 'image' | 'video' }>([
  ['image/avif', { extension: 'avif', mediaType: 'image' }],
  ['image/jpeg', { extension: 'jpg', mediaType: 'image' }],
  ['image/png', { extension: 'png', mediaType: 'image' }],
  ['image/webp', { extension: 'webp', mediaType: 'image' }],
  ['video/mp4', { extension: 'mp4', mediaType: 'video' }],
  ['video/webm', { extension: 'webm', mediaType: 'video' }],
])
const maximumMediaSize = 4 * 1024 * 1024

async function matchesMediaType(file: File, mediaType: 'image' | 'video') {
  const bytes = Buffer.from(await file.slice(0, 16).arrayBuffer())
  if (mediaType === 'video') {
    if (file.type === 'video/mp4') return bytes.length >= 12 && bytes.toString('ascii', 4, 8) === 'ftyp'
    if (file.type === 'video/webm') return bytes.length >= 4 && bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
    return false
  }
  switch (file.type) {
    case 'image/jpeg':
      return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    case 'image/png':
      return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    case 'image/webp':
      return bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
    case 'image/avif': {
      const brand = bytes.toString('ascii', 8, 12)
      return bytes.length >= 12 && bytes.toString('ascii', 4, 8) === 'ftyp' && (brand === 'avif' || brand === 'avis')
    }
    default:
      return false
  }
}

function sameOrigin(request: NextRequest) {
  return request.headers.get('origin') === request.nextUrl.origin &&
    request.headers.get('sec-fetch-site') !== 'cross-site'
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-origin upload requests are not allowed.' }, { status: 403 })
  }

  let uploadedUrl: string | undefined
  try {
    await requireAdminSession('admin')
    const { productId } = await params
    const product = await getAdminProduct(productId)
    if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 })

    const form = await request.formData()
    const file = form.get('file')
    const altText = form.get('altText')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose an image or video to upload.' }, { status: 400 })
    const media = acceptedMediaTypes.get(file.type)
    if (!media) {
      return NextResponse.json({ error: 'Use a JPEG, PNG, WebP, AVIF, MP4, or WebM file.' }, { status: 415 })
    }
    if (file.size < 1 || file.size > maximumMediaSize) {
      return NextResponse.json({ error: 'Images and short videos must be smaller than 4 MB.' }, { status: 413 })
    }
    if (!(await matchesMediaType(file, media.mediaType))) {
      return NextResponse.json({ error: 'The file contents do not match the selected media type.' }, { status: 415 })
    }
    if (altText !== null && typeof altText !== 'string') {
      return NextResponse.json({ error: 'Image description is invalid.' }, { status: 400 })
    }
    if (typeof altText === 'string' && altText.length > 500) {
      return NextResponse.json({ error: 'Image description must be at most 500 characters.' }, { status: 400 })
    }

    const pathname = `products/${productId}/${randomUUID()}.${media.extension}`
    const blob = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: false,
      contentType: file.type,
    })
    uploadedUrl = blob.url
    const asset = await addProductAsset(
      productId,
      blob.pathname,
      blob.url,
      typeof altText === 'string' ? altText : undefined,
      media.mediaType,
    )
    return NextResponse.json({ data: asset }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (uploadedUrl) {
      try {
        await del(uploadedUrl)
      } catch (cleanupError) {
        console.error('[admin-upload] Blob cleanup failed', cleanupError instanceof Error ? cleanupError.name : 'UnknownError')
      }
    }
    return adminApiError(error)
  }
}

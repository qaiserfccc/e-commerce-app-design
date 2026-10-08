import { randomUUID } from 'node:crypto'
import { del, put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { addProductAsset, getAdminProduct } from '@/app/actions/admin'
import { requireAdminSession } from '@/lib/auth/admin'
import { adminApiError } from '@/lib/auth/admin-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const acceptedImageTypes = new Map([
  ['image/avif', 'avif'],
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])
const maximumFileSize = 4 * 1024 * 1024

async function matchesImageType(file: File) {
  const bytes = Buffer.from(await file.slice(0, 16).arrayBuffer())
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
    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose an image to upload.' }, { status: 400 })
    const extension = acceptedImageTypes.get(file.type)
    if (!extension) {
      return NextResponse.json({ error: 'Use a JPEG, PNG, WebP, or AVIF image.' }, { status: 415 })
    }
    if (file.size < 1 || file.size > maximumFileSize) {
      return NextResponse.json({ error: 'Images must be smaller than 4 MB.' }, { status: 413 })
    }
    if (!(await matchesImageType(file))) {
      return NextResponse.json({ error: 'The image file contents do not match its declared type.' }, { status: 415 })
    }
    if (altText !== null && typeof altText !== 'string') {
      return NextResponse.json({ error: 'Image description is invalid.' }, { status: 400 })
    }
    if (typeof altText === 'string' && altText.length > 500) {
      return NextResponse.json({ error: 'Image description must be at most 500 characters.' }, { status: 400 })
    }

    const pathname = `products/${productId}/${randomUUID()}.${extension}`
    const blob = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: false,
      contentType: file.type,
    })
    uploadedUrl = blob.url
    const asset = await addProductAsset(productId, blob.pathname, blob.url, typeof altText === 'string' ? altText : undefined)
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

import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth/admin'
import { adminApiError } from '@/lib/auth/admin-api'
import { isSameOriginOrNativeRequest } from '@/lib/http/api-origin'
import { uploadMedia } from '@/lib/server/media-storage.mjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const imageTypes = new Map([
  ['image/avif', 'avif'],
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])
const maximumSize = 4 * 1024 * 1024

async function matches(file: File) {
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

export async function POST(request: NextRequest) {
  if (!isSameOriginOrNativeRequest(request)) {
    return NextResponse.json({ error: 'Cross-origin upload requests are not allowed.' }, { status: 403 })
  }
  try {
    await requireAdminSession('admin')
    const file = (await request.formData()).get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose an image to upload.' }, { status: 400 })
    const extension = imageTypes.get(file.type)
    if (!extension) return NextResponse.json({ error: 'Use a JPEG, PNG, WebP, or AVIF image.' }, { status: 415 })
    if (file.size < 1 || file.size > maximumSize) return NextResponse.json({ error: 'Images must be smaller than 4 MB.' }, { status: 413 })
    if (!(await matches(file))) return NextResponse.json({ error: 'The file contents do not match the image type.' }, { status: 415 })
    const stored = await uploadMedia(`content/${randomUUID()}.${extension}`, Buffer.from(await file.arrayBuffer()), file.type)
    return NextResponse.json({ data: stored }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return adminApiError(error)
  }
}

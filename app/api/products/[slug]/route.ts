import { NextRequest, NextResponse } from 'next/server'
import { getProductAssets, getProductBySlug } from '@/app/actions/storefront'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 })
    }
    const product = await getProductBySlug(slug)
    if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 })
    const assets = await getProductAssets(product.id)
    return NextResponse.json(
      { data: { ...product, assets }, timestamp: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    )
  } catch (error) {
    console.error('[products-api] Product request failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'Unable to load this product right now.' }, { status: 500 })
  }
}

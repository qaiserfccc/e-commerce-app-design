import { and, desc, eq, ilike, or } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { storefrontFaqs } from '@/lib/data/storefront-faq'
import { db } from '@/lib/db'
import { storeCategories, storeProducts } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (rawQuery.length > 100) {
    return NextResponse.json({ error: 'Search query is too long.' }, { status: 400 })
  }

  try {
    const searchTerms = rawQuery.toLowerCase().split(/\s+/).filter((term) => term.length >= 2).slice(0, 5)
    const searchConditions = searchTerms.flatMap((term) => {
      const pattern = `%${escapeLikePattern(term)}%`
      return [
        ilike(storeProducts.name, pattern),
        ilike(storeProducts.brand, pattern),
        ilike(storeCategories.name, pattern),
      ]
    })
    const products = searchTerms.length
      ? await db
          .select({
            name: storeProducts.name,
            slug: storeProducts.slug,
            brand: storeProducts.brand,
            category: storeCategories.name,
            price: storeProducts.price,
            currency: storeProducts.currency,
            inStock: storeProducts.stockQuantity,
            diameterMm: storeProducts.diameterMm,
            baseCurve: storeProducts.baseCurve,
            waterContent: storeProducts.waterContent,
            wearDuration: storeProducts.wearDuration,
            packContents: storeProducts.packContents,
            powerType: storeProducts.powerType,
            powerRange: storeProducts.powerRange,
          })
          .from(storeProducts)
          .leftJoin(storeCategories, eq(storeCategories.id, storeProducts.categoryId))
          .where(and(
            eq(storeProducts.status, 'active'),
            or(...searchConditions),
          ))
          .orderBy(desc(storeProducts.isFeatured), desc(storeProducts.createdAt))
          .limit(8)
      : []

    return NextResponse.json(
      {
        data: {
          faqs: storefrontFaqs.map(({ question, answer }) => ({
            question,
            answer,
            source: '/faq',
          })),
          products: products.map(({ inStock, slug, ...product }) => ({
            ...product,
            availability: inStock > 0 ? 'in_stock' : 'out_of_stock',
            url: `/product/${encodeURIComponent(slug)}`,
          })),
          guidance: [
            'Use only facts included in this response; do not invent product attributes, prices, stock, delivery charges, or order status.',
            'For contact-lens fitting or eye-health advice, direct the shopper to an eye-care professional.',
            'This endpoint contains public storefront information only and cannot look up customer accounts or orders.',
          ],
        },
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      },
    )
  } catch (error) {
    console.error('[chatbot-knowledge-api] Knowledge request failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'Failed to fetch chatbot knowledge' }, { status: 500 })
  }
}

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, '\\$&')
}

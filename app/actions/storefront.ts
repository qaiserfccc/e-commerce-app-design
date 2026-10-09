'use server'

import { db } from '@/lib/db'
import { storeProducts, storeProductAssets, storeProductVariants } from '@/lib/db/schema'
import { eq, desc, asc, ilike, and, or } from 'drizzle-orm'

/**
 * Storefront data access layer - READ operations
 * All operations are public (no auth required for storefront viewing)
 */

export async function getActiveProducts() {
  try {
    return await db
      .select({
        id: storeProducts.id,
        name: storeProducts.name,
        slug: storeProducts.slug,
        description: storeProducts.description,
        category: storeProducts.category,
        price: storeProducts.price,
        currency: storeProducts.currency,
        status: storeProducts.status,
        stockQuantity: storeProducts.stockQuantity,
        heroImageUrl: storeProducts.heroImageUrl,
        createdAt: storeProducts.createdAt,
        updatedAt: storeProducts.updatedAt,
      })
      .from(storeProducts)
      .where(eq(storeProducts.status, 'active'))
      .orderBy(desc(storeProducts.createdAt))
  } catch (error) {
    console.error('[storefront] Product query failed', error instanceof Error ? error.name : 'UnknownError')
    throw new Error('Failed to fetch products')
  }
}

export async function getProductBySlug(slug: string) {
  if (typeof slug !== 'string' || slug.length > 180) throw new Error('Product slug is invalid.')
  try {
    const product = await db
      .select({
        id: storeProducts.id,
        name: storeProducts.name,
        slug: storeProducts.slug,
        description: storeProducts.description,
        category: storeProducts.category,
        price: storeProducts.price,
        currency: storeProducts.currency,
        status: storeProducts.status,
        stockQuantity: storeProducts.stockQuantity,
        heroImageUrl: storeProducts.heroImageUrl,
        createdAt: storeProducts.createdAt,
        updatedAt: storeProducts.updatedAt,
      })
      .from(storeProducts)
      .where(and(eq(storeProducts.slug, slug), eq(storeProducts.status, 'active')))
      .limit(1)

    return product[0] || null
  } catch (error) {
    console.error('[storefront] Product detail query failed', error instanceof Error ? error.name : 'UnknownError')
    throw new Error('Failed to fetch product')
  }
}

export async function getProductsByCategory(category: string) {
  if (typeof category !== 'string' || !category.trim() || category.length > 100) throw new Error('Category is invalid.')
  try {
    return await db
      .select({
        id: storeProducts.id,
        name: storeProducts.name,
        slug: storeProducts.slug,
        description: storeProducts.description,
        category: storeProducts.category,
        price: storeProducts.price,
        currency: storeProducts.currency,
        status: storeProducts.status,
        stockQuantity: storeProducts.stockQuantity,
        heroImageUrl: storeProducts.heroImageUrl,
        createdAt: storeProducts.createdAt,
        updatedAt: storeProducts.updatedAt,
      })
      .from(storeProducts)
      .where(and(eq(storeProducts.category, category), eq(storeProducts.status, 'active')))
      .orderBy(desc(storeProducts.createdAt))
  } catch (error) {
    console.error('[storefront] Category query failed', error instanceof Error ? error.name : 'UnknownError')
    throw new Error('Failed to fetch products')
  }
}

export async function searchProducts(query: string) {
  if (typeof query !== 'string' || query.length > 100) throw new Error('Search query is invalid.')
  const normalizedQuery = query.trim()
  if (!normalizedQuery) return getActiveProducts()

  try {
    return await db
      .select({
        id: storeProducts.id,
        name: storeProducts.name,
        slug: storeProducts.slug,
        description: storeProducts.description,
        category: storeProducts.category,
        price: storeProducts.price,
        currency: storeProducts.currency,
        status: storeProducts.status,
        stockQuantity: storeProducts.stockQuantity,
        heroImageUrl: storeProducts.heroImageUrl,
        createdAt: storeProducts.createdAt,
        updatedAt: storeProducts.updatedAt,
      })
      .from(storeProducts)
      .where(
        and(
          eq(storeProducts.status, 'active'),
          or(
            ilike(storeProducts.name, `%${normalizedQuery}%`),
            ilike(storeProducts.category, `%${normalizedQuery}%`),
            ilike(storeProducts.description, `%${normalizedQuery}%`),
          ),
        ),
      )
      .orderBy(desc(storeProducts.createdAt))
      .limit(100)
  } catch (error) {
    console.error('[storefront] Search query failed', error instanceof Error ? error.name : 'UnknownError')
    throw new Error('Failed to search products')
  }
}

export async function getProductAssets(productId: string) {
  if (typeof productId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)) {
    throw new Error('Product ID is invalid.')
  }
  try {
    const assets = await db
      .select()
      .from(storeProductAssets)
      .where(eq(storeProductAssets.productId, productId))
      .orderBy(asc(storeProductAssets.sortOrder))
    return assets.map((asset) => {
      if (asset.mediaType !== 'image' && asset.mediaType !== 'video') {
        throw new Error('Stored product media has an unsupported type.')
      }
      const mediaType: 'image' | 'video' = asset.mediaType
      return { ...asset, mediaType }
    })
  } catch (error) {
    console.error('[storefront] Product image query failed', error instanceof Error ? error.name : 'UnknownError')
    throw new Error('Failed to fetch product assets')
  }
}

export async function getActiveProductVariants(productId: string) {
  if (typeof productId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)) {
    throw new Error('Product ID is invalid.')
  }
  try {
    return await db
      .select({
        id: storeProductVariants.id,
        productId: storeProductVariants.productId,
        name: storeProductVariants.name,
        color: storeProductVariants.color,
        powerDiopters: storeProductVariants.powerDiopters,
        baseCurve: storeProductVariants.baseCurve,
        diameterMm: storeProductVariants.diameterMm,
        packSize: storeProductVariants.packSize,
        price: storeProductVariants.price,
        currency: storeProductVariants.currency,
        stockQuantity: storeProductVariants.stockQuantity,
        sku: storeProductVariants.sku,
      })
      .from(storeProductVariants)
      .where(and(eq(storeProductVariants.productId, productId), eq(storeProductVariants.isActive, true)))
      .orderBy(asc(storeProductVariants.name))
  } catch (error) {
    console.error('[storefront] Product variant query failed', error instanceof Error ? error.name : 'UnknownError')
    throw new Error('Failed to fetch product options')
  }
}

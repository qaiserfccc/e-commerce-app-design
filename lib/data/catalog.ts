import 'server-only'

import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm'
import { cached } from '@/lib/cache'
import { db } from '@/lib/db'
import {
  storeCategories,
  storeLensShades,
  storeLensTypes,
  storeOrderItems,
  storeOrders,
  storeProductAssets,
  storeProductCategories,
  storeProductRelations,
  storeProductReviews,
  storeProducts,
  storeProductVariants,
  storeSettings,
} from '@/lib/db/schema'
import {
  buildCategoryPaths,
  DEFAULT_PRODUCT_PAGE,
  descendantIds,
  SECTION_SOURCES,
  type CategoryNode,
  type ProductPageSettings,
} from '@/lib/catalog-types'

export const CATALOG_NAMESPACE = 'catalog'

async function loadCategories(): Promise<CategoryNode[]> {
  const [rows, counts] = await Promise.all([
    db.select().from(storeCategories).where(eq(storeCategories.isActive, true)).orderBy(asc(storeCategories.sortOrder), asc(storeCategories.name)),
    db
      .select({ categoryId: storeProductCategories.categoryId, count: sql<number>`count(distinct ${storeProducts.id})::int` })
      .from(storeProductCategories)
      .innerJoin(storeProducts, eq(storeProducts.id, storeProductCategories.productId))
      .where(eq(storeProducts.status, 'active'))
      .groupBy(storeProductCategories.categoryId),
  ])
  const direct = new Map(counts.map((row) => [row.categoryId, row.count]))
  const nodes = buildCategoryPaths(rows.map((row) => ({
    id: row.id, parentId: row.parentId, name: row.name, slug: row.slug, description: row.description,
    imageUrl: row.imageUrl, sortOrder: row.sortOrder, isActive: row.isActive, showInMenu: row.showInMenu,
  })))
  return nodes.map((node) => {
    const branch = descendantIds(nodes, node.id)
    let productCount = 0
    for (const id of branch) productCount += direct.get(id) ?? 0
    return { ...node, productCount }
  })
}

export function getCategories() {
  return cached(CATALOG_NAMESPACE, 'categories', 600, loadCategories)
}

const productColumns = {
  id: storeProducts.id,
  name: storeProducts.name,
  slug: storeProducts.slug,
  description: storeProducts.description,
  shortDescription: storeProducts.shortDescription,
  categoryId: storeProducts.categoryId,
  brandId: storeProducts.brandId,
  lensShadeId: storeProducts.lensShadeId,
  lensTypeId: storeProducts.lensTypeId,
  category: storeCategories.name,
  brand: storeProducts.brand,
  sku: storeProducts.sku,
  price: storeProducts.price,
  compareAtPrice: storeProducts.compareAtPrice,
  currency: storeProducts.currency,
  status: storeProducts.status,
  stockQuantity: storeProducts.stockQuantity,
  heroImageUrl: storeProducts.heroImageUrl,
  colors: storeProducts.colors,
  diameterMm: storeProducts.diameterMm,
  baseCurve: storeProducts.baseCurve,
  waterContent: storeProducts.waterContent,
  material: storeProducts.material,
  wearDuration: storeProducts.wearDuration,
  packContents: storeProducts.packContents,
  powerType: storeProducts.powerType,
  powerRange: storeProducts.powerRange,
  uvProtection: storeProducts.uvProtection,
  fdaApproved: storeProducts.fdaApproved,
  features: storeProducts.features,
  specs: storeProducts.specs,
  usageInstructions: storeProducts.usageInstructions,
  isFeatured: storeProducts.isFeatured,
  seoTitle: storeProducts.seoTitle,
  seoDescription: storeProducts.seoDescription,
  createdAt: storeProducts.createdAt,
  updatedAt: storeProducts.updatedAt,
}

async function enrich<T extends { id: string; categoryId: string; lensShadeId: string | null; lensTypeId: string | null }>(products: T[]) {
  const ids = products.map((product) => product.id)
  if (!ids.length) return []
  const [assets, variants, ratings, categories, assignments, shades, types] = await Promise.all([
    db.select().from(storeProductAssets).where(inArray(storeProductAssets.productId, ids)).orderBy(asc(storeProductAssets.sortOrder), asc(storeProductAssets.createdAt)),
    db.select().from(storeProductVariants).where(and(inArray(storeProductVariants.productId, ids), eq(storeProductVariants.isActive, true))).orderBy(asc(storeProductVariants.price)),
    db
      .select({ productId: storeProductReviews.productId, avg: sql<string>`avg(${storeProductReviews.rating})`, count: sql<number>`count(*)::int` })
      .from(storeProductReviews)
      .where(and(inArray(storeProductReviews.productId, ids), eq(storeProductReviews.isApproved, true)))
      .groupBy(storeProductReviews.productId),
    getCategories(),
    db.select({ productId: storeProductCategories.productId, categoryId: storeProductCategories.categoryId, name: storeCategories.name })
      .from(storeProductCategories)
      .innerJoin(storeCategories, eq(storeCategories.id, storeProductCategories.categoryId))
      .where(inArray(storeProductCategories.productId, ids)),
    db.select().from(storeLensShades).where(inArray(storeLensShades.id, products.map((product) => product.lensShadeId).filter((id): id is string => Boolean(id)))),
    db.select().from(storeLensTypes).where(inArray(storeLensTypes.id, products.map((product) => product.lensTypeId).filter((id): id is string => Boolean(id)))),
  ])
  const group = <R extends { productId: string }>(rows: R[]) => {
    const map = new Map<string, R[]>()
    for (const row of rows) map.set(row.productId, [...(map.get(row.productId) ?? []), row])
    return map
  }
  const assetMap = group(assets)
  const variantMap = group(variants)
  const ratingMap = new Map(ratings.map((row) => [row.productId, row]))
  const pathMap = new Map(categories.map((category) => [category.id, category.path]))
  const assigned = new Map<string, Array<{ id: string; name: string }>>()
  for (const row of assignments) assigned.set(row.productId, [...(assigned.get(row.productId) ?? []), { id: row.categoryId, name: row.name }])
  const shadesById = new Map(shades.map((shade) => [shade.id, shade]))
  const typesById = new Map(types.map((type) => [type.id, type]))
  return products.map((product) => ({
    ...product,
    categoryPath: pathMap.get(product.categoryId) ?? '',
    categoryIds: assigned.get(product.id)?.map((category) => category.id) ?? [product.categoryId],
    categories: assigned.get(product.id) ?? [],
    lensShade: product.lensShadeId ? shadesById.get(product.lensShadeId) ?? null : null,
    lensType: product.lensTypeId ? typesById.get(product.lensTypeId) ?? null : null,
    assets: assetMap.get(product.id) ?? [],
    variants: variantMap.get(product.id) ?? [],
    ratingAvg: ratingMap.get(product.id) ? Math.round(Number(ratingMap.get(product.id)!.avg) * 10) / 10 : null,
    ratingCount: ratingMap.get(product.id)?.count ?? 0,
  }))
}

async function loadCatalog(categorySlug: string | null, query: string | null) {
  const conditions = [eq(storeProducts.status, 'active'), eq(storeCategories.isActive, true)]
  if (categorySlug) {
    const all = await getCategories()
    const target = all.find((category) => category.slug === categorySlug)
    if (!target) return []
    const matchingCategoryIds = [...descendantIds(all, target.id)]
    conditions.push(inArray(storeProducts.id, db.select({ productId: storeProductCategories.productId }).from(storeProductCategories).where(inArray(storeProductCategories.categoryId, matchingCategoryIds))))
  }
  if (query) {
    const like = `%${query.replace(/[%_\\]/g, '\\$&')}%`
    conditions.push(or(ilike(storeProducts.name, like), ilike(storeProducts.brand, like), ilike(storeProducts.description, like), ilike(storeCategories.name, like))!)
  }
  const rows = await db
    .select(productColumns)
    .from(storeProducts)
    .innerJoin(storeCategories, eq(storeCategories.id, storeProducts.categoryId))
    .where(and(...conditions))
    .orderBy(desc(storeProducts.createdAt))
  return enrich(rows)
}

export function getCatalog(category: string | null = null, query: string | null = null) {
  return cached(CATALOG_NAMESPACE, `products:${category ?? ''}:${(query ?? '').toLowerCase()}`, 300, () => loadCatalog(category, query))
}

export type CatalogProduct = Awaited<ReturnType<typeof loadCatalog>>[number]

async function loadProduct(slug: string) {
  const [row] = await db
    .select(productColumns)
    .from(storeProducts)
    .innerJoin(storeCategories, eq(storeCategories.id, storeProducts.categoryId))
    .where(and(eq(storeProducts.slug, slug), eq(storeProducts.status, 'active')))
    .limit(1)
  if (!row) return null
  return (await enrich([row]))[0]
}

export function getProduct(slug: string) {
  return cached(CATALOG_NAMESPACE, `product:${slug}`, 300, () => loadProduct(slug))
}

export async function getProductPageSettings(): Promise<ProductPageSettings> {
  return cached('content', 'product_page', 300, async () => {
    const [row] = await db.select().from(storeSettings).where(eq(storeSettings.key, 'product_page')).limit(1)
    const value = row?.value as Partial<ProductPageSettings> | undefined
    if (!value || !Array.isArray(value.sections)) return DEFAULT_PRODUCT_PAGE
    return { sections: value.sections, reviews: { ...DEFAULT_PRODUCT_PAGE.reviews, ...(value.reviews ?? {}) } }
  })
}

export async function getApprovedReviews(productId: string) {
  return db
    .select({ id: storeProductReviews.id, author: storeProductReviews.author, rating: storeProductReviews.rating, title: storeProductReviews.title, body: storeProductReviews.body, createdAt: storeProductReviews.createdAt })
    .from(storeProductReviews)
    .where(and(eq(storeProductReviews.productId, productId), eq(storeProductReviews.isApproved, true)))
    .orderBy(desc(storeProductReviews.createdAt))
    .limit(50)
}

async function activeByIds(ids: string[]) {
  if (!ids.length) return []
  const rows = await db
    .select(productColumns)
    .from(storeProducts)
    .innerJoin(storeCategories, eq(storeCategories.id, storeProducts.categoryId))
    .where(and(inArray(storeProducts.id, ids), eq(storeProducts.status, 'active')))
  const order = new Map(ids.map((id, index) => [id, index]))
  rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
  return enrich(rows)
}

const activeOrders = ne(storeOrders.status, 'cancelled')

async function idsFor(source: (typeof SECTION_SOURCES)[number], product: { id: string; categoryId: string }, limit: number) {
  const overfetch = limit + 8
  switch (source) {
    case 'manual': {
      const rows = await db.select({ id: storeProductRelations.relatedProductId }).from(storeProductRelations).where(eq(storeProductRelations.productId, product.id)).orderBy(asc(storeProductRelations.sortOrder))
      return rows.map((row) => row.id)
    }
    case 'same_category': {
      const rows = await db.select({ id: storeProducts.id }).from(storeProducts).where(and(eq(storeProducts.categoryId, product.categoryId), eq(storeProducts.status, 'active'), ne(storeProducts.id, product.id))).orderBy(desc(storeProducts.createdAt)).limit(overfetch)
      return rows.map((row) => row.id)
    }
    case 'co_purchased': {
      const mine = db.select({ orderId: storeOrderItems.orderId }).from(storeOrderItems).where(eq(storeOrderItems.productId, product.id))
      const rows = await db
        .select({ id: storeOrderItems.productId, n: sql<number>`sum(${storeOrderItems.quantity})` })
        .from(storeOrderItems)
        .innerJoin(storeOrders, eq(storeOrders.id, storeOrderItems.orderId))
        .where(and(inArray(storeOrderItems.orderId, mine), ne(storeOrderItems.productId, product.id), activeOrders))
        .groupBy(storeOrderItems.productId)
        .orderBy(desc(sql`sum(${storeOrderItems.quantity})`))
        .limit(overfetch)
      return rows.map((row) => row.id)
    }
    case 'best_selling': {
      const rows = await db
        .select({ id: storeOrderItems.productId })
        .from(storeOrderItems)
        .innerJoin(storeOrders, eq(storeOrders.id, storeOrderItems.orderId))
        .where(and(ne(storeOrderItems.productId, product.id), activeOrders))
        .groupBy(storeOrderItems.productId)
        .orderBy(desc(sql`sum(${storeOrderItems.quantity})`))
        .limit(overfetch)
      return rows.map((row) => row.id)
    }
    case 'recent_orders': {
      const rows = await db
        .select({ id: storeOrderItems.productId, at: sql<string>`max(${storeOrders.createdAt})` })
        .from(storeOrderItems)
        .innerJoin(storeOrders, eq(storeOrders.id, storeOrderItems.orderId))
        .where(and(ne(storeOrderItems.productId, product.id), activeOrders))
        .groupBy(storeOrderItems.productId)
        .orderBy(desc(sql`max(${storeOrders.createdAt})`))
        .limit(overfetch)
      return rows.map((row) => row.id)
    }
    case 'featured': {
      const rows = await db.select({ id: storeProducts.id }).from(storeProducts).where(and(eq(storeProducts.isFeatured, true), eq(storeProducts.status, 'active'), ne(storeProducts.id, product.id))).orderBy(desc(storeProducts.updatedAt)).limit(overfetch)
      return rows.map((row) => row.id)
    }
    case 'newest': {
      const rows = await db.select({ id: storeProducts.id }).from(storeProducts).where(and(eq(storeProducts.status, 'active'), ne(storeProducts.id, product.id))).orderBy(desc(storeProducts.createdAt)).limit(overfetch)
      return rows.map((row) => row.id)
    }
  }
}

/** Resolves every enabled product-page section (configured in admin) into product lists. */
export function getProductSections(product: { id: string; categoryId: string }) {
  return cached(CATALOG_NAMESPACE, `sections:${product.id}`, 300, async () => {
    const settings = await getProductPageSettings()
    const sections = []
    const shown = new Set<string>()
    for (const section of settings.sections.filter((item) => item.enabled)) {
      const ids = (await idsFor(section.source, product, section.limit)).filter((id) => !shown.has(id) || section.source === 'manual')
      const products = (await activeByIds(ids)).slice(0, section.limit)
      if (!products.length) continue
      products.forEach((item) => shown.add(item.id))
      sections.push({ id: section.id, title: section.title, products })
    }
    return sections
  })
}

export async function getProductsByIds(ids: string[]) {
  return activeByIds(ids)
}

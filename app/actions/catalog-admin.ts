'use server'

import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm'
import { invalidateCache } from '@/lib/cache'
import { requireAdminSession } from '@/lib/auth/admin'
import { buildCategoryPaths, DEFAULT_PRODUCT_PAGE, descendantIds, SECTION_SOURCES, type ProductPageSettings } from '@/lib/catalog-types'
import { db } from '@/lib/db'
import {
  storeActivityEvents,
  storeCategories,
  storeProductAssets,
  storeProductRelations,
  storeProductReviews,
  storeProducts,
  storeProductVariants,
  storeSettings,
} from '@/lib/db/schema'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const moneyPattern = /^\d{1,10}(?:\.\d{1,2})?$/
const productStatuses = ['active', 'draft', 'archived'] as const

function text(value: unknown, max: number, label: string, required = false) {
  const result = typeof value === 'string' ? value.trim() : ''
  if (required && !result) throw new Error(`${label} is required.`)
  if (result.length > max) throw new Error(`${label} must be ${max} characters or fewer.`)
  return result || null
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
}

function uuid(value: unknown, label: string) {
  if (typeof value !== 'string' || !uuidPattern.test(value)) throw new Error(`${label} is invalid.`)
  return value
}

function bust() {
  invalidateCache('catalog')
  invalidateCache('content')
}

async function log(entityType: string, entityId: string, eventType: string, payload: Record<string, unknown> = {}) {
  await db.insert(storeActivityEvents).values({ entityType, entityId, eventType, payload })
}

// ───────────── Categories ─────────────

export type CategoryInput = {
  name: unknown
  slug?: unknown
  parentId?: unknown
  description?: unknown
  imageUrl?: unknown
  sortOrder?: unknown
  isActive?: unknown
  showInMenu?: unknown
  seoTitle?: unknown
  seoDescription?: unknown
}

function parseCategory(input: CategoryInput) {
  const name = text(input.name, 120, 'Name', true)!
  const slug = typeof input.slug === 'string' && input.slug.trim() ? input.slug.trim().toLowerCase() : slugify(name)
  if (!slugPattern.test(slug) || slug.length > 80) throw new Error('Slug may use lowercase letters, numbers and hyphens only.')
  const imageUrl = text(input.imageUrl, 1000, 'Image URL')
  if (imageUrl && !/^https:\/\//i.test(imageUrl)) throw new Error('Image URL must start with https://')
  const sortOrder = Number(input.sortOrder ?? 0)
  if (!Number.isInteger(sortOrder) || Math.abs(sortOrder) > 100000) throw new Error('Sort order must be a whole number.')
  return {
    name,
    slug,
    parentId: input.parentId ? uuid(input.parentId, 'Parent category') : null,
    description: text(input.description, 2000, 'Description'),
    imageUrl,
    sortOrder,
    isActive: input.isActive !== false,
    showInMenu: input.showInMenu !== false,
    seoTitle: text(input.seoTitle, 160, 'SEO title'),
    seoDescription: text(input.seoDescription, 320, 'SEO description'),
  }
}

export async function getAdminCategories() {
  await requireAdminSession('staff')
  const rows = await db.select().from(storeCategories).orderBy(asc(storeCategories.sortOrder), asc(storeCategories.name))
  const counts = await db
    .select({ id: storeProducts.categoryId, n: sql<number>`count(*)::int` })
    .from(storeProducts)
    .groupBy(storeProducts.categoryId)
  const own = new Map(counts.map((row) => [row.id, row.n]))
  return buildCategoryPaths(rows).map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    productCount: own.get(row.id) ?? 0,
  }))
}

async function assertValidParent(id: string | null, parentId: string | null) {
  if (!parentId) return
  if (id && parentId === id) throw new Error('A category cannot be its own parent.')
  const rows = await db.select({ id: storeCategories.id, parentId: storeCategories.parentId }).from(storeCategories)
  if (!rows.some((row) => row.id === parentId)) throw new Error('Parent category not found.')
  if (id && descendantIds(rows, id).has(parentId)) throw new Error('A category cannot be moved under its own descendant.')
}

export async function createCategory(input: CategoryInput) {
  await requireAdminSession('admin')
  const values = parseCategory(input)
  await assertValidParent(null, values.parentId)
  try {
    const [row] = await db.insert(storeCategories).values(values).returning()
    await log('category', row.id, 'created', { name: row.name })
    bust()
    return { id: row.id }
  } catch (error) {
    if (String((error as { code?: string }).code) === '23505') throw new Error('That slug is already used by another category.')
    throw error
  }
}

export async function updateCategory(id: string, input: CategoryInput) {
  await requireAdminSession('admin')
  uuid(id, 'Category')
  const values = parseCategory(input)
  await assertValidParent(id, values.parentId)
  try {
    const [row] = await db.update(storeCategories).set({ ...values, updatedAt: new Date() }).where(eq(storeCategories.id, id)).returning({ id: storeCategories.id })
    if (!row) throw new Error('Category not found.')
    await log('category', id, 'updated', { name: values.name })
    bust()
  } catch (error) {
    if (String((error as { code?: string }).code) === '23505') throw new Error('That slug is already used by another category.')
    throw error
  }
}

export async function deleteCategory(id: string) {
  await requireAdminSession('admin')
  uuid(id, 'Category')
  const [child] = await db.select({ id: storeCategories.id }).from(storeCategories).where(eq(storeCategories.parentId, id)).limit(1)
  if (child) throw new Error('Delete or move the sub-categories first.')
  const [product] = await db.select({ id: storeProducts.id }).from(storeProducts).where(eq(storeProducts.categoryId, id)).limit(1)
  if (product) throw new Error('Move or delete the products in this category first.')
  await db.delete(storeCategories).where(eq(storeCategories.id, id))
  await log('category', id, 'deleted')
  bust()
}

/** Swaps sort order with the neighbouring sibling. */
export async function moveCategory(id: string, direction: 'up' | 'down') {
  await requireAdminSession('admin')
  uuid(id, 'Category')
  const [current] = await db.select().from(storeCategories).where(eq(storeCategories.id, id)).limit(1)
  if (!current) throw new Error('Category not found.')
  const siblings = await db
    .select({ id: storeCategories.id })
    .from(storeCategories)
    .where(current.parentId ? eq(storeCategories.parentId, current.parentId) : sql`${storeCategories.parentId} is null`)
    .orderBy(asc(storeCategories.sortOrder), asc(storeCategories.name))
  const index = siblings.findIndex((row) => row.id === id)
  const target = direction === 'up' ? index - 1 : index + 1
  if (index < 0 || target < 0 || target >= siblings.length) return
  const order = siblings.map((row) => row.id)
  ;[order[index], order[target]] = [order[target], order[index]]
  await db.transaction(async (tx) => {
    for (const [position, siblingId] of order.entries()) {
      await tx.update(storeCategories).set({ sortOrder: position }).where(eq(storeCategories.id, siblingId))
    }
  })
  bust()
}

// ───────────── Products ─────────────

export type AdminProductInput = {
  name: unknown
  slug?: unknown
  categoryId: unknown
  brand?: unknown
  sku?: unknown
  shortDescription?: unknown
  description?: unknown
  price: unknown
  compareAtPrice?: unknown
  currency?: unknown
  status?: unknown
  colors?: unknown
  diameterMm?: unknown
  baseCurve?: unknown
  waterContent?: unknown
  material?: unknown
  wearDuration?: unknown
  packContents?: unknown
  powerType?: unknown
  powerRange?: unknown
  uvProtection?: unknown
  features?: unknown
  specs?: unknown
  usageInstructions?: unknown
  isFeatured?: unknown
  seoTitle?: unknown
  seoDescription?: unknown
}

function money(value: unknown, label: string, required: boolean) {
  const raw = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : ''
  if (!raw) {
    if (required) throw new Error(`${label} is required.`)
    return null
  }
  if (!moneyPattern.test(raw)) throw new Error(`${label} must be a valid amount.`)
  return raw
}

function decimal(value: unknown, label: string) {
  const raw = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : ''
  if (!raw) return null
  if (!/^\d{1,2}(?:\.\d{1,2})?$/.test(raw)) throw new Error(`${label} must be a number like 14.2.`)
  return raw
}

function parseProduct(input: AdminProductInput) {
  const name = text(input.name, 200, 'Name', true)!
  const slug = typeof input.slug === 'string' && input.slug.trim() ? input.slug.trim().toLowerCase() : slugify(name)
  if (!slugPattern.test(slug) || slug.length > 120) throw new Error('Slug may use lowercase letters, numbers and hyphens only.')
  const status = typeof input.status === 'string' ? input.status : 'active'
  if (!(productStatuses as readonly string[]).includes(status)) throw new Error('Invalid status.')
  const colors = (Array.isArray(input.colors) ? input.colors : []).slice(0, 40).map((item) => {
    const color = item as { name?: unknown; hex?: unknown }
    const colorName = text(color.name, 60, 'Color name', true)!
    const hex = typeof color.hex === 'string' && /^#[0-9a-f]{6}$/i.test(color.hex) ? color.hex : '#999999'
    return { name: colorName, hex }
  })
  const features = (Array.isArray(input.features) ? input.features : []).map((item) => text(item, 200, 'Feature')).filter((item): item is string => Boolean(item)).slice(0, 30)
  const specs = (Array.isArray(input.specs) ? input.specs : []).slice(0, 30).flatMap((item) => {
    const spec = item as { label?: unknown; value?: unknown }
    const label = text(spec.label, 80, 'Spec label')
    const value = text(spec.value, 300, 'Spec value')
    return label && value ? [{ label, value }] : []
  })
  const currency = typeof input.currency === 'string' && /^[A-Z]{3}$/.test(input.currency) ? input.currency : 'PKR'
  return {
    name,
    slug,
    categoryId: uuid(input.categoryId, 'Category'),
    brand: text(input.brand, 100, 'Brand'),
    sku: text(input.sku, 80, 'SKU'),
    shortDescription: text(input.shortDescription, 400, 'Short description'),
    description: text(input.description, 10000, 'Description'),
    price: money(input.price, 'Price', true)!,
    compareAtPrice: money(input.compareAtPrice, 'Compare-at price', false),
    currency,
    status,
    colors,
    diameterMm: decimal(input.diameterMm, 'Diameter'),
    baseCurve: decimal(input.baseCurve, 'Base curve'),
    waterContent: text(input.waterContent, 60, 'Water content'),
    material: text(input.material, 120, 'Material'),
    wearDuration: text(input.wearDuration, 120, 'Wear duration'),
    packContents: text(input.packContents, 120, 'Pack contents'),
    powerType: text(input.powerType, 120, 'Power type'),
    powerRange: text(input.powerRange, 200, 'Power range'),
    uvProtection: input.uvProtection === true,
    features,
    specs,
    usageInstructions: text(input.usageInstructions, 4000, 'Usage instructions'),
    isFeatured: input.isFeatured === true,
    seoTitle: text(input.seoTitle, 160, 'SEO title'),
    seoDescription: text(input.seoDescription, 320, 'SEO description'),
  }
}

function duplicateMessage(error: unknown) {
  const code = String((error as { code?: string }).code)
  if (code === '23505') return 'Slug or SKU is already used by another product.'
  if (code === '23503') return 'Selected category no longer exists.'
  return null
}

export async function getAdminProducts() {
  await requireAdminSession('staff')
  const rows = await db
    .select({ product: storeProducts, categoryName: storeCategories.name })
    .from(storeProducts)
    .innerJoin(storeCategories, eq(storeCategories.id, storeProducts.categoryId))
    .orderBy(desc(storeProducts.createdAt))
  const relations = await db.select().from(storeProductRelations).orderBy(asc(storeProductRelations.sortOrder))
  const relatedBy = new Map<string, string[]>()
  for (const relation of relations) relatedBy.set(relation.productId, [...(relatedBy.get(relation.productId) ?? []), relation.relatedProductId])
  return rows.map(({ product, categoryName }) => ({
    ...product,
    category: categoryName,
    relatedProductIds: relatedBy.get(product.id) ?? [],
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  }))
}

export async function getAdminProduct(id: string) {
  await requireAdminSession('staff')
  uuid(id, 'Product')
  const [row] = await db.select().from(storeProducts).where(eq(storeProducts.id, id)).limit(1)
  return row ?? null
}

export async function createProduct(input: AdminProductInput) {
  await requireAdminSession('admin')
  const values = parseProduct(input)
  try {
    const [row] = await db.insert(storeProducts).values({ ...values, stockQuantity: 0 }).returning({ id: storeProducts.id })
    await log('product', row.id, 'created', { name: values.name })
    bust()
    return { id: row.id }
  } catch (error) {
    const message = duplicateMessage(error)
    if (message) throw new Error(message)
    throw error
  }
}

export async function updateProduct(id: string, input: AdminProductInput) {
  await requireAdminSession('admin')
  uuid(id, 'Product')
  const values = parseProduct(input)
  try {
    const [hasVariants] = await db.select({ id: storeProductVariants.id }).from(storeProductVariants).where(eq(storeProductVariants.productId, id)).limit(1)
    // Price and stock are derived from variants once any exist.
    const { price, ...rest } = values
    const [row] = await db
      .update(storeProducts)
      .set({ ...rest, ...(hasVariants ? {} : { price }), updatedAt: new Date() })
      .where(eq(storeProducts.id, id))
      .returning({ id: storeProducts.id })
    if (!row) throw new Error('Product not found.')
    await log('product', id, 'updated', { name: values.name })
    bust()
  } catch (error) {
    const message = duplicateMessage(error)
    if (message) throw new Error(message)
    throw error
  }
}

export async function deleteProduct(id: string) {
  await requireAdminSession('admin')
  uuid(id, 'Product')
  const { del } = await import('@vercel/blob')
  const assets = await db.select({ url: storeProductAssets.blobUrl }).from(storeProductAssets).where(eq(storeProductAssets.productId, id))
  await db.transaction(async (tx) => {
    await tx.delete(storeProductAssets).where(eq(storeProductAssets.productId, id))
    await tx.delete(storeProductVariants).where(eq(storeProductVariants.productId, id))
    await tx.delete(storeProducts).where(eq(storeProducts.id, id))
  })
  const urls = assets.map((asset) => asset.url).filter((url): url is string => Boolean(url))
  if (urls.length) await del(urls).catch(() => undefined)
  await log('product', id, 'deleted')
  bust()
}

export async function setProductRelations(productId: string, relatedIds: string[]) {
  await requireAdminSession('admin')
  uuid(productId, 'Product')
  const ids = [...new Set(relatedIds.map((value) => uuid(value, 'Related product')))].filter((value) => value !== productId).slice(0, 24)
  if (ids.length) {
    const found = await db.select({ id: storeProducts.id }).from(storeProducts).where(inArray(storeProducts.id, ids))
    if (found.length !== ids.length) throw new Error('One of the related products no longer exists.')
  }
  await db.transaction(async (tx) => {
    await tx.delete(storeProductRelations).where(eq(storeProductRelations.productId, productId))
    if (ids.length) await tx.insert(storeProductRelations).values(ids.map((relatedProductId, sortOrder) => ({ productId, relatedProductId, sortOrder })))
  })
  await log('product', productId, 'relations_updated', { count: ids.length })
  bust()
}

// ───────────── Reviews ─────────────

export async function getAdminReviews() {
  await requireAdminSession('staff')
  const rows = await db
    .select({ review: storeProductReviews, productName: storeProducts.name })
    .from(storeProductReviews)
    .innerJoin(storeProducts, eq(storeProducts.id, storeProductReviews.productId))
    .orderBy(asc(storeProductReviews.isApproved), desc(storeProductReviews.createdAt))
    .limit(300)
  return rows.map(({ review, productName }) => ({ ...review, productName, createdAt: review.createdAt.toISOString() }))
}

export async function createAdminReview(input: { productId: unknown; author: unknown; rating: unknown; title?: unknown; body: unknown; isApproved?: unknown }) {
  await requireAdminSession('admin')
  const rating = Number(input.rating)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('Rating must be 1–5.')
  await db.insert(storeProductReviews).values({
    productId: uuid(input.productId, 'Product'),
    author: text(input.author, 80, 'Author', true)!,
    rating,
    title: text(input.title, 120, 'Title'),
    body: text(input.body, 2000, 'Review', true)!,
    isApproved: input.isApproved !== false,
  })
  bust()
}

export async function setReviewApproval(id: string, approved: boolean) {
  await requireAdminSession('admin')
  await db.update(storeProductReviews).set({ isApproved: approved }).where(eq(storeProductReviews.id, uuid(id, 'Review')))
  bust()
}

export async function deleteReview(id: string) {
  await requireAdminSession('admin')
  await db.delete(storeProductReviews).where(eq(storeProductReviews.id, uuid(id, 'Review')))
  bust()
}

// ───────────── Product page settings ─────────────

export async function getAdminProductPageSettings(): Promise<ProductPageSettings> {
  await requireAdminSession('staff')
  const [row] = await db.select().from(storeSettings).where(eq(storeSettings.key, 'product_page')).limit(1)
  const value = row?.value as Partial<ProductPageSettings> | undefined
  if (!value || !Array.isArray(value.sections)) return DEFAULT_PRODUCT_PAGE
  return { sections: value.sections, reviews: { ...DEFAULT_PRODUCT_PAGE.reviews, ...(value.reviews ?? {}) } }
}

export async function saveProductPageSettings(input: ProductPageSettings) {
  await requireAdminSession('admin')
  const sections = (Array.isArray(input.sections) ? input.sections : []).slice(0, 12).map((section, index) => {
    if (!(SECTION_SOURCES as readonly string[]).includes(section.source)) throw new Error('Invalid section source.')
    const limit = Number(section.limit)
    return {
      id: typeof section.id === 'string' && /^[a-z0-9-]{1,40}$/.test(section.id) ? section.id : `section-${index + 1}`,
      title: text(section.title, 80, 'Section title', true)!,
      source: section.source,
      limit: Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 12) : 4,
      enabled: section.enabled === true,
    }
  })
  const value: ProductPageSettings = {
    sections,
    reviews: {
      enabled: input.reviews?.enabled === true,
      allowSubmission: input.reviews?.allowSubmission === true,
      autoApprove: input.reviews?.autoApprove === true,
    },
  }
  await db
    .insert(storeSettings)
    .values({ key: 'product_page', value })
    .onConflictDoUpdate({ target: storeSettings.key, set: { value, updatedAt: new Date() } })
  bust()
}

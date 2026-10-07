'use server'

import { desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  storeActivityEvents,
  storeCustomers,
  storeOrderItems,
  storeOrders,
  storeProductAssets,
  storeProducts,
} from '@/lib/db/schema'
import { requireAdminSession } from '@/lib/auth/admin'

const productStatuses = ['active', 'draft', 'archived'] as const
const orderStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] as const
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const pricePattern = /^\d{1,10}(?:\.\d{1,2})?$/

type ProductInput = {
  name: string
  slug: string
  description?: string
  category: string
  price: string
  currency?: string
  stockQuantity?: number
  status?: string
}

function requireText(value: unknown, field: string, maxLength: number) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new Error(`${field} is required and must be at most ${maxLength} characters.`)
  }
  return value.trim()
}

function validateUuid(value: string, field: string) {
  if (typeof value !== 'string' || !uuidPattern.test(value)) throw new Error(`${field} is invalid.`)
}

function validateProductInput(data: ProductInput) {
  if (!data || typeof data !== 'object') throw new Error('Product details are required.')
  const name = requireText(data.name, 'Product name', 180)
  const slug = requireText(data.slug, 'Product slug', 180)
  const category = requireText(data.category, 'Category', 100)
  const price = requireText(data.price, 'Price', 16)
  if (data.description !== undefined && typeof data.description !== 'string') throw new Error('Product description is invalid.')
  if (data.currency !== undefined && typeof data.currency !== 'string') throw new Error('Currency is invalid.')
  const description = data.description?.trim() || null
  const currency = (data.currency || 'USD').trim().toUpperCase()
  const status = data.status || 'active'
  const stockQuantity = data.stockQuantity ?? 0

  if (!slugPattern.test(slug)) throw new Error('Use lowercase letters, numbers, and single hyphens in the slug.')
  if (!pricePattern.test(price)) throw new Error('Enter a price with up to two decimal places.')
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Currency must be a three-letter ISO code.')
  if (!productStatuses.includes(status as (typeof productStatuses)[number])) throw new Error('Product status is invalid.')
  if (!Number.isSafeInteger(stockQuantity) || stockQuantity < 0) throw new Error('Stock quantity must be a non-negative whole number.')
  if (description && description.length > 5000) throw new Error('Description must be at most 5000 characters.')

  return { name, slug, category, price, description, currency, status, stockQuantity }
}

function boundedLimit(limit: number, fallback: number, maximum: number) {
  if (!Number.isInteger(limit) || limit < 1) return fallback
  return Math.min(limit, maximum)
}

export async function getAllProducts() {
  await requireAdminSession()
  return db.select().from(storeProducts).orderBy(desc(storeProducts.updatedAt))
}

export async function getAdminProduct(productId: string) {
  await requireAdminSession()
  validateUuid(productId, 'Product ID')
  const [product] = await db.select().from(storeProducts).where(eq(storeProducts.id, productId)).limit(1)
  return product ?? null
}

export async function getAllProductAssets() {
  await requireAdminSession()
  return db.select().from(storeProductAssets).orderBy(storeProductAssets.sortOrder)
}

export async function createProduct(data: ProductInput) {
  await requireAdminSession()
  const values = validateProductInput(data)

  return db.transaction(async (tx) => {
    const [product] = await tx.insert(storeProducts).values(values).returning()
    await tx.insert(storeActivityEvents).values({
      entityType: 'product',
      entityId: product.id,
      eventType: 'created',
      payload: {},
    })
    return product
  })
}

export async function updateProduct(
  productId: string,
  data: Partial<ProductInput> & { heroImageUrl?: string | null },
) {
  await requireAdminSession()
  if (!data || typeof data !== 'object') throw new Error('Product changes are required.')
  validateUuid(productId, 'Product ID')

  const changes: Partial<typeof storeProducts.$inferInsert> = {}
  if (data.name !== undefined) changes.name = requireText(data.name, 'Product name', 180)
  if (data.slug !== undefined) {
    changes.slug = requireText(data.slug, 'Product slug', 180)
    if (!slugPattern.test(changes.slug)) throw new Error('Use lowercase letters, numbers, and single hyphens in the slug.')
  }
  if (data.category !== undefined) changes.category = requireText(data.category, 'Category', 100)
  if (data.price !== undefined) {
    changes.price = requireText(data.price, 'Price', 16)
    if (!pricePattern.test(changes.price)) throw new Error('Enter a price with up to two decimal places.')
  }
  if (data.description !== undefined) {
    if (typeof data.description !== 'string') throw new Error('Product description is invalid.')
    changes.description = data.description?.trim() || null
    if (changes.description && changes.description.length > 5000) throw new Error('Description must be at most 5000 characters.')
  }
  if (data.currency !== undefined) {
    if (typeof data.currency !== 'string') throw new Error('Currency is invalid.')
    changes.currency = data.currency.trim().toUpperCase()
    if (!/^[A-Z]{3}$/.test(changes.currency)) throw new Error('Currency must be a three-letter ISO code.')
  }
  if (data.status !== undefined) {
    if (!productStatuses.includes(data.status as (typeof productStatuses)[number])) throw new Error('Product status is invalid.')
    changes.status = data.status
  }
  if (data.stockQuantity !== undefined) {
    if (!Number.isSafeInteger(data.stockQuantity) || data.stockQuantity < 0) throw new Error('Stock quantity must be a non-negative whole number.')
    changes.stockQuantity = data.stockQuantity
  }
  if (data.heroImageUrl !== undefined) {
    if (data.heroImageUrl !== null) {
      if (typeof data.heroImageUrl !== 'string') throw new Error('Product image URL is invalid.')
      let imageUrl: URL
      try {
        imageUrl = new URL(data.heroImageUrl)
      } catch {
        throw new Error('Product image URL is invalid.')
      }
      if (imageUrl.protocol !== 'https:') throw new Error('Product images must use HTTPS.')
    }
    changes.heroImageUrl = data.heroImageUrl
  }
  if (!Object.keys(changes).length) throw new Error('No product changes were supplied.')

  return db.transaction(async (tx) => {
    const [product] = await tx
      .update(storeProducts)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(storeProducts.id, productId))
      .returning()
    if (!product) throw new Error('Product not found.')

    await tx.insert(storeActivityEvents).values({
      entityType: 'product',
      entityId: productId,
      eventType: 'updated',
      payload: { updatedFields: Object.keys(changes) },
    })
    return product
  })
}

export async function deleteProduct(productId: string) {
  await requireAdminSession()
  validateUuid(productId, 'Product ID')
  return updateProduct(productId, { status: 'archived' })
}

export async function updateProductStock(productId: string, quantity: number) {
  await requireAdminSession()
  validateUuid(productId, 'Product ID')
  if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error('Stock quantity must be a non-negative whole number.')

  return db.transaction(async (tx) => {
    const [product] = await tx
      .update(storeProducts)
      .set({ stockQuantity: quantity, updatedAt: new Date() })
      .where(eq(storeProducts.id, productId))
      .returning()
    if (!product) throw new Error('Product not found.')

    await tx.insert(storeActivityEvents).values({
      entityType: 'product',
      entityId: productId,
      eventType: 'stock_updated',
      payload: { newQuantity: quantity },
    })
    return product
  })
}

export async function addProductAsset(
  productId: string,
  blobPathname: string,
  blobUrl: string,
  altText?: string,
  sortOrder = 0,
) {
  await requireAdminSession()
  validateUuid(productId, 'Product ID')
  const pathname = requireText(blobPathname, 'Blob path', 500)
  if (altText !== undefined && typeof altText !== 'string') throw new Error('Image description is invalid.')
  const text = altText?.trim() || null
  if (text && text.length > 500) throw new Error('Image description must be at most 500 characters.')
  if (!Number.isSafeInteger(sortOrder) || sortOrder < 0) throw new Error('Image order is invalid.')
  const url = new URL(blobUrl)
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.blob.vercel-storage.com')) {
    throw new Error('Only public Vercel Blob image URLs can be saved.')
  }

  return db.transaction(async (tx) => {
    const [product] = await tx.select().from(storeProducts).where(eq(storeProducts.id, productId)).limit(1)
    if (!product) throw new Error('Product not found.')

    const [asset] = await tx
      .insert(storeProductAssets)
      .values({ productId, blobPathname: pathname, blobUrl: url.toString(), altText: text, sortOrder })
      .returning()
    if (!product.heroImageUrl) {
      await tx.update(storeProducts).set({ heroImageUrl: asset.blobUrl, updatedAt: new Date() }).where(eq(storeProducts.id, productId))
    }
    await tx.insert(storeActivityEvents).values({
      entityType: 'product_asset',
      entityId: asset.id,
      eventType: 'created',
      payload: { productId },
    })
    return asset
  })
}

export async function getProductAssetById(assetId: string) {
  await requireAdminSession()
  validateUuid(assetId, 'Asset ID')
  const [asset] = await db.select().from(storeProductAssets).where(eq(storeProductAssets.id, assetId)).limit(1)
  return asset ?? null
}

export async function deleteProductAsset(assetId: string) {
  await requireAdminSession()
  validateUuid(assetId, 'Asset ID')

  return db.transaction(async (tx) => {
    const [asset] = await tx.select().from(storeProductAssets).where(eq(storeProductAssets.id, assetId)).limit(1)
    if (!asset) throw new Error('Product image not found.')

    await tx.delete(storeProductAssets).where(eq(storeProductAssets.id, assetId))
    const [product] = await tx.select().from(storeProducts).where(eq(storeProducts.id, asset.productId)).limit(1)
    if (product?.heroImageUrl === asset.blobUrl) {
      const [nextAsset] = await tx
        .select()
        .from(storeProductAssets)
        .where(eq(storeProductAssets.productId, asset.productId))
        .orderBy(storeProductAssets.sortOrder)
        .limit(1)
      await tx
        .update(storeProducts)
        .set({ heroImageUrl: nextAsset?.blobUrl ?? null, updatedAt: new Date() })
        .where(eq(storeProducts.id, asset.productId))
    }
    await tx.insert(storeActivityEvents).values({
      entityType: 'product_asset',
      entityId: asset.id,
      eventType: 'deleted',
      payload: { productId: asset.productId },
    })
    return { success: true }
  })
}

export async function getAllOrders(limit = 50, offset = 0, status = '') {
  await requireAdminSession()
  const pageSize = boundedLimit(limit, 50, 100)
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000) throw new Error('Order page is invalid.')
  if (typeof status !== 'string' || (status && !orderStatuses.includes(status as (typeof orderStatuses)[number]))) {
    throw new Error('Order status filter is invalid.')
  }
  const conditions = status ? eq(storeOrders.status, status) : undefined
  const [rows, countRows] = await Promise.all([
    (conditions
      ? db
          .select({ order: storeOrders, customer: storeCustomers })
          .from(storeOrders)
          .leftJoin(storeCustomers, eq(storeOrders.customerId, storeCustomers.id))
          .where(conditions)
      : db
          .select({ order: storeOrders, customer: storeCustomers })
          .from(storeOrders)
          .leftJoin(storeCustomers, eq(storeOrders.customerId, storeCustomers.id)))
      .orderBy(desc(storeOrders.createdAt))
      .limit(pageSize)
      .offset(offset),
    (conditions
      ? db.select({ total: sql<number>`count(*)::int` }).from(storeOrders).where(conditions)
      : db.select({ total: sql<number>`count(*)::int` }).from(storeOrders)),
  ])
  const ids = rows.map(({ order }) => order.id)
  const items = ids.length
    ? await db.select().from(storeOrderItems).where(inArray(storeOrderItems.orderId, ids))
    : []

  return {
    items: rows.map(({ order, customer }) => ({
      ...order,
      customer: customer
        ? {
            email: customer.email,
            firstName: customer.firstName,
            lastName: customer.lastName,
          }
        : null,
      items: items.filter((item) => item.orderId === order.id),
    })),
    total: Number(countRows[0]?.total ?? 0),
  }
}

export async function getOrderStats() {
  await requireAdminSession()
  const [summaryRows, revenueRows, statusRows] = await Promise.all([
    db
    .select({
      totalOrders: sql<number>`count(*)::int`,
      pendingOrders: sql<number>`count(*) filter (where ${storeOrders.status} = 'pending')::int`,
    })
    .from(storeOrders),
    db
      .select({
        currency: storeOrders.currency,
        totalRevenue: sql<string>`coalesce(sum(${storeOrders.total}), 0)::text`,
        avgOrderValue: sql<string>`coalesce(avg(${storeOrders.total}), 0)::text`,
      })
      .from(storeOrders)
      .where(sql`${storeOrders.status} in ('paid', 'processing', 'shipped', 'delivered')`)
      .groupBy(storeOrders.currency)
      .orderBy(storeOrders.currency),
    db
      .select({ status: storeOrders.status, count: sql<number>`count(*)::int` })
      .from(storeOrders)
      .groupBy(storeOrders.status)
      .orderBy(storeOrders.status),
  ])
  const summary = summaryRows[0] ?? { totalOrders: 0, pendingOrders: 0 }
  return {
    totalOrders: Number(summary.totalOrders),
    pendingOrders: Number(summary.pendingOrders),
    revenueByCurrency: revenueRows,
    ordersByStatus: Object.fromEntries(statusRows.map((row) => [row.status, Number(row.count)])),
  }
}

export async function updateOrderStatus(orderId: string, status: string) {
  await requireAdminSession()
  validateUuid(orderId, 'Order ID')
  if (!orderStatuses.includes(status as (typeof orderStatuses)[number])) throw new Error('Order status is invalid.')

  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(storeOrders).where(eq(storeOrders.id, orderId)).limit(1).for('update')
    if (!current) throw new Error('Order not found.')
    if (current.status === status) return current

    const transitions: Record<string, readonly string[]> = {
      pending: ['paid', 'processing', 'cancelled'],
      paid: ['processing', 'cancelled', 'refunded'],
      processing: ['shipped', 'cancelled', 'refunded'],
      shipped: ['delivered', 'refunded'],
      delivered: ['refunded'],
      cancelled: [],
      refunded: [],
    }
    if (!transitions[current.status]?.includes(status)) {
      throw new Error(`An order cannot move from ${current.status} to ${status}.`)
    }

    const [updated] = await tx
      .update(storeOrders)
      .set({ status, updatedAt: new Date() })
      .where(eq(storeOrders.id, orderId))
      .returning()
    await tx.insert(storeActivityEvents).values({
      entityType: 'order',
      entityId: orderId,
      eventType: 'status_updated',
      payload: { newStatus: status },
    })
    return updated
  })
}

export async function getAllCustomers(limit = 50, offset = 0, query = '') {
  await requireAdminSession()
  const pageSize = boundedLimit(limit, 50, 100)
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000) throw new Error('Customer page is invalid.')
  if (typeof query !== 'string' || query.length > 100) throw new Error('Customer search is invalid.')
  const normalizedQuery = query.trim()
  const conditions = normalizedQuery
    ? or(
        ilike(storeCustomers.email, `%${normalizedQuery}%`),
        ilike(storeCustomers.firstName, `%${normalizedQuery}%`),
        ilike(storeCustomers.lastName, `%${normalizedQuery}%`),
      )
    : undefined
  const [items, countRows] = await Promise.all([
    (conditions ? db.select().from(storeCustomers).where(conditions) : db.select().from(storeCustomers))
      .orderBy(desc(storeCustomers.createdAt))
      .limit(pageSize)
      .offset(offset),
    conditions
      ? db.select({ total: sql<number>`count(*)::int` }).from(storeCustomers).where(conditions)
      : db.select({ total: sql<number>`count(*)::int` }).from(storeCustomers),
  ])
  return { items, total: Number(countRows[0]?.total ?? 0) }
}

export async function getCustomerStats() {
  await requireAdminSession()
  const [stats] = await db.select({ totalCustomers: sql<number>`count(*)::int` }).from(storeCustomers)
  return stats
}

export async function updateCustomer(
  customerId: string,
  data: Partial<Pick<typeof storeCustomers.$inferInsert, 'firstName' | 'lastName' | 'phone' | 'marketingOptIn'>>,
) {
  await requireAdminSession()
  if (!data || typeof data !== 'object') throw new Error('Customer changes are required.')
  validateUuid(customerId, 'Customer ID')

  const changes: Partial<typeof storeCustomers.$inferInsert> = {}
  for (const key of ['firstName', 'lastName', 'phone'] as const) {
    const value = data[key]
    if (value !== undefined) {
      if (value !== null && (typeof value !== 'string' || value.length > 180)) {
        throw new Error(`${key} must be at most 180 characters.`)
      }
      changes[key] = value?.trim() || null
    }
  }
  if (data.marketingOptIn !== undefined) {
    if (typeof data.marketingOptIn !== 'boolean') throw new Error('Marketing preference is invalid.')
    changes.marketingOptIn = data.marketingOptIn
  }
  if (!Object.keys(changes).length) throw new Error('No customer changes were supplied.')

  return db.transaction(async (tx) => {
    const [customer] = await tx
      .update(storeCustomers)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(storeCustomers.id, customerId))
      .returning()
    if (!customer) throw new Error('Customer not found.')
    await tx.insert(storeActivityEvents).values({
      entityType: 'customer',
      entityId: customerId,
      eventType: 'updated',
      payload: { updatedFields: Object.keys(changes) },
    })
    return customer
  })
}

export async function getRecentActivity(limit = 20) {
  await requireAdminSession()
  return db
    .select({
      id: storeActivityEvents.id,
      entityType: storeActivityEvents.entityType,
      entityId: storeActivityEvents.entityId,
      eventType: storeActivityEvents.eventType,
      createdAt: storeActivityEvents.createdAt,
    })
    .from(storeActivityEvents)
    .orderBy(desc(storeActivityEvents.createdAt))
    .limit(boundedLimit(limit, 20, 100))
}

export async function getDashboardMetrics() {
  await requireAdminSession()
  const [orders, customers] = await Promise.all([getOrderStats(), getCustomerStats()])
  return {
    orders: {
      ...orders,
    },
    customers: { totalCustomers: Number(customers.totalCustomers) },
  }
}

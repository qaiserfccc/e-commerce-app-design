'use server'

import { createHash, randomUUID } from 'node:crypto'
import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { del } from '@vercel/blob'
import { db } from '@/lib/db'
import {
  storeActivityEvents,
  storeCustomers,
  storeOrderItems,
  storeOrders,
  storeProductAssets,
  storeProductImportItems,
  storeProductImportRuns,
  storeProducts,
  storeProductVariants,
  storeAdminUsers,
} from '@/lib/db/schema'
import { clearAdminSession, hashAdminPassword, requireAdminSession } from '@/lib/auth/admin'

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

type ProductVariantInput = {
  sku?: unknown
  name: unknown
  color?: unknown
  powerDiopters?: unknown
  baseCurve?: unknown
  diameterMm?: unknown
  packSize?: unknown
  price: unknown
  currency?: unknown
  stockQuantity: unknown
  isActive?: unknown
}

const variantDecimalPattern = /^-?\d{1,4}(?:\.\d{1,2})?$/

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
  const currency = (data.currency || 'PKR').trim().toUpperCase()
  const status = data.status || 'active'
  const stockQuantity = data.stockQuantity ?? 0

  if (!slugPattern.test(slug)) throw new Error('Use lowercase letters, numbers, and single hyphens in the slug.')
  if (!pricePattern.test(price)) throw new Error('Enter a price with up to two decimal places.')
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Currency must be a three-letter ISO code.')
  if (!productStatuses.includes(status as (typeof productStatuses)[number])) throw new Error('Product status is invalid.')
  if (!Number.isSafeInteger(stockQuantity) || stockQuantity < 0 || stockQuantity > 2_147_483_647) {
    throw new Error('Stock quantity must be a whole number between zero and 2,147,483,647.')
  }
  if (description && description.length > 5000) throw new Error('Description must be at most 5000 characters.')

  return { name, slug, category, price, description, currency, status, stockQuantity }
}

function validateProductVariantInput(data: ProductVariantInput) {
  if (!data || typeof data !== 'object') throw new Error('Variant details are required.')
  const name = requireText(data.name, 'Variant name', 180)
  const optionalText = (value: unknown, field: string, maxLength: number) => {
    if (value === undefined || value === null || value === '') return null
    return requireText(value, field, maxLength)
  }
  const sku = optionalText(data.sku, 'SKU', 64)
  const color = optionalText(data.color, 'Color', 80)
  const optionalDecimal = (value: unknown, field: string) => {
    if (value === undefined || value === null || value === '') return null
    if (typeof value !== 'string' && typeof value !== 'number') throw new Error(`${field} is invalid.`)
    const normalized = String(value).trim()
    if (!variantDecimalPattern.test(normalized)) throw new Error(`${field} must be a number with up to two decimal places.`)
    return normalized
  }
  const powerDiopters = optionalDecimal(data.powerDiopters, 'Power')
  const baseCurve = optionalDecimal(data.baseCurve, 'Base curve')
  const diameterMm = optionalDecimal(data.diameterMm, 'Diameter')
  if (powerDiopters !== null && (Number(powerDiopters) < -9999.99 || Number(powerDiopters) > 9999.99)) {
    throw new Error('Power is outside the supported range.')
  }
  for (const [value, field] of [[baseCurve, 'Base curve'], [diameterMm, 'Diameter']] as const) {
    if (value !== null && (Number(value) <= 0 || Number(value) > 99.99)) throw new Error(`${field} must be greater than zero and at most 99.99.`)
  }
  let packSize: number | null = null
  if (data.packSize !== undefined && data.packSize !== null && data.packSize !== '') {
    if ((typeof data.packSize !== 'number' && typeof data.packSize !== 'string') ||
        (typeof data.packSize === 'string' && !/^\d+$/.test(data.packSize))) {
      throw new Error('Pack size must be a whole number from 1 to 1000.')
    }
    packSize = Number(data.packSize)
    if (!Number.isSafeInteger(packSize) || packSize < 1 || packSize > 1000) {
      throw new Error('Pack size must be a whole number from 1 to 1000.')
    }
  }
  const price = requireText(data.price, 'Price', 16)
  if (data.currency !== undefined && typeof data.currency !== 'string') throw new Error('Currency is invalid.')
  const currency = (data.currency || 'PKR').trim().toUpperCase()
  const stockQuantity = data.stockQuantity
  if (!pricePattern.test(price)) throw new Error('Enter a price with up to two decimal places.')
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Currency must be a three-letter ISO code.')
  if (typeof stockQuantity !== 'number' || !Number.isSafeInteger(stockQuantity) || stockQuantity < 0 || stockQuantity > 2_147_483_647) {
    throw new Error('Stock quantity must be a whole number between zero and 2,147,483,647.')
  }
  if (data.isActive !== undefined && typeof data.isActive !== 'boolean') throw new Error('Variant status is invalid.')
  return {
    sku,
    name,
    color,
    powerDiopters,
    baseCurve,
    diameterMm,
    packSize,
    price,
    currency,
    stockQuantity,
    isActive: data.isActive ?? true,
  }
}

async function refreshProductVariantSummary(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], productId: string) {
  const activeVariants = await tx
    .select({ price: storeProductVariants.price, currency: storeProductVariants.currency, stockQuantity: storeProductVariants.stockQuantity })
    .from(storeProductVariants)
    .where(and(eq(storeProductVariants.productId, productId), eq(storeProductVariants.isActive, true)))
    .orderBy(storeProductVariants.price)
  if (activeVariants.length) {
    const maximumStock = 2_147_483_647
    let stockQuantity = 0
    for (const variant of activeVariants) {
      if (variant.stockQuantity > maximumStock - stockQuantity) {
        throw new Error('Combined variant stock exceeds the supported range.')
      }
      stockQuantity += variant.stockQuantity
    }
    await tx
      .update(storeProducts)
      .set({
        price: activeVariants[0].price,
        currency: activeVariants[0].currency,
        stockQuantity: Number(stockQuantity),
        updatedAt: new Date(),
      })
      .where(eq(storeProducts.id, productId))
  } else {
    await tx.update(storeProducts).set({ stockQuantity: 0, updatedAt: new Date() }).where(eq(storeProducts.id, productId))
  }
}

function boundedLimit(limit: number, fallback: number, maximum: number) {
  if (!Number.isInteger(limit) || limit < 1) return fallback
  return Math.min(limit, maximum)
}

export async function getAllProducts() {
  await requireAdminSession()
  return db
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
      sourceProductId: storeProducts.sourceProductId,
      sourceUrl: storeProducts.sourceUrl,
      sourceImageUrl: storeProducts.sourceImageUrl,
      createdAt: storeProducts.createdAt,
      updatedAt: storeProducts.updatedAt,
    })
    .from(storeProducts)
    .orderBy(desc(storeProducts.updatedAt))
}

export async function getAdminProductSource(productId: string) {
  await requireAdminSession()
  validateUuid(productId, 'Product ID')
  const [product] = await db
    .select({
      sourceProductId: storeProducts.sourceProductId,
      sourceUrl: storeProducts.sourceUrl,
      sourcePayload: storeProducts.sourcePayload,
      sourceContentHash: storeProducts.sourceContentHash,
    })
    .from(storeProducts)
    .where(eq(storeProducts.id, productId))
    .limit(1)
  return product ?? null
}

export async function getAdminProduct(productId: string) {
  await requireAdminSession()
  validateUuid(productId, 'Product ID')
  const [product] = await db.select().from(storeProducts).where(eq(storeProducts.id, productId)).limit(1)
  return product ?? null
}

export async function getAllProductAssets() {
  await requireAdminSession()
  return db.select().from(storeProductAssets).orderBy(asc(storeProductAssets.sortOrder), asc(storeProductAssets.createdAt))
}

export async function getAllProductVariants() {
  await requireAdminSession()
  return db.select().from(storeProductVariants).orderBy(storeProductVariants.name)
}

export async function getProductVariants(productId: string) {
  await requireAdminSession()
  validateUuid(productId, 'Product ID')
  return db
    .select()
    .from(storeProductVariants)
    .where(eq(storeProductVariants.productId, productId))
    .orderBy(storeProductVariants.name)
}

export async function createProductVariant(productId: string, data: ProductVariantInput) {
  await requireAdminSession('admin')
  validateUuid(productId, 'Product ID')
  const values = validateProductVariantInput(data)

  return db.transaction(async (tx) => {
    const [product] = await tx.select().from(storeProducts).where(eq(storeProducts.id, productId)).limit(1).for('update')
    if (!product) throw new Error('Product not found.')
    if (values.currency !== product.currency) throw new Error('Variant currency must match the product currency.')
    const [variant] = await tx.insert(storeProductVariants).values({ ...values, productId }).returning()
    await refreshProductVariantSummary(tx, productId)
    await tx.insert(storeActivityEvents).values({
      entityType: 'product_variant',
      entityId: variant.id,
      eventType: 'created',
      payload: { productId },
    })
    return variant
  })
}

export async function updateProductVariant(productId: string, variantId: string, data: ProductVariantInput) {
  await requireAdminSession('admin')
  validateUuid(productId, 'Product ID')
  validateUuid(variantId, 'Variant ID')
  const values = validateProductVariantInput(data)

  return db.transaction(async (tx) => {
    const [product] = await tx.select().from(storeProducts).where(eq(storeProducts.id, productId)).limit(1).for('update')
    if (!product) throw new Error('Product not found.')
    if (values.currency !== product.currency) throw new Error('Variant currency must match the product currency.')
    const [variant] = await tx
      .update(storeProductVariants)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(storeProductVariants.id, variantId), eq(storeProductVariants.productId, productId)))
      .returning()
    if (!variant) throw new Error('Product variant not found.')
    await refreshProductVariantSummary(tx, productId)
    await tx.insert(storeActivityEvents).values({
      entityType: 'product_variant',
      entityId: variant.id,
      eventType: 'updated',
      payload: { productId },
    })
    return variant
  })
}

export async function archiveProductVariant(productId: string, variantId: string) {
  await requireAdminSession('admin')
  validateUuid(productId, 'Product ID')
  validateUuid(variantId, 'Variant ID')
  return db.transaction(async (tx) => {
    const [product] = await tx.select({ id: storeProducts.id }).from(storeProducts).where(eq(storeProducts.id, productId)).limit(1).for('update')
    if (!product) throw new Error('Product not found.')
    const [variant] = await tx
      .update(storeProductVariants)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(storeProductVariants.id, variantId), eq(storeProductVariants.productId, productId)))
      .returning()
    if (!variant) throw new Error('Product variant not found.')
    await refreshProductVariantSummary(tx, productId)
    await tx.insert(storeActivityEvents).values({
      entityType: 'product_variant',
      entityId: variant.id,
      eventType: 'archived',
      payload: { productId },
    })
    return variant
  })
}

export async function createProduct(data: ProductInput) {
  await requireAdminSession('admin')
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatSourcePrice(amount: unknown, minorUnit: number) {
  if (typeof amount !== 'string' || !/^\d+$/.test(amount)) {
    throw new Error('The ISK Lenses catalog returned an unsupported price format.')
  }
  const paddedAmount = amount.padStart(minorUnit + 1, '0')
  const price = minorUnit
    ? `${paddedAmount.slice(0, -minorUnit)}.${paddedAmount.slice(-minorUnit)}`
    : amount
  if (!pricePattern.test(price)) throw new Error('The ISK Lenses catalog returned a price outside the supported range.')
  return price
}

function decodeSourceText(value: string) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_match, entity: string) => {
      const codePoint = entity[0].toLowerCase() === 'x'
        ? Number.parseInt(entity.slice(1), 16)
        : Number.parseInt(entity, 10)
      return Number.isFinite(codePoint) && codePoint > 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : ' '
    })
    .replace(/\s+/g, ' ')
    .trim()
}

function extractSourceFacts(description: string) {
  const specificationPairs = [...description.matchAll(
    /<tr\b[^>]*>\s*<td\b[^>]*>([\s\S]*?)<\/td>\s*<td\b[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi,
  )]
    .map(([, label, value]) => [decodeSourceText(label), decodeSourceText(value)] as const)
    .filter(([label, value]) => Boolean(label && value))
    .slice(0, 100)
  const packageBlock = description.match(
    /<div\b[^>]*class=["'][^"']*package-include-items[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  )?.[1] ?? ''
  const packageContents = [...packageBlock.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(([, item]) => decodeSourceText(item))
    .filter(Boolean)
    .slice(0, 100)
  return { specifications: specificationPairs, packageContents }
}

function safeSourceMediaUrl(value: unknown) {
  if (typeof value !== 'string' || value.length > 2048) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password) return null
    return url.toString()
  } catch {
    return null
  }
}

function collectVideoReferences(value: unknown, path: string[] = [], found: string[] = []): string[] {
  const collectFromVideoField = (candidate: unknown) => {
    if (typeof candidate === 'string') {
      const url = safeSourceMediaUrl(candidate)
      if (url && !found.includes(url)) found.push(url)
      return
    }
    if (Array.isArray(candidate)) {
      for (const item of candidate.slice(0, 200)) collectFromVideoField(item)
      return
    }
    if (isRecord(candidate)) {
      for (const [key, item] of Object.entries(candidate)) {
        if (found.length >= 100) break
        if (/(url|src|embed|video)/i.test(key)) collectFromVideoField(item)
      }
    }
  }
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 200)) collectVideoReferences(item, path, found)
    return found
  }
  if (!isRecord(value)) return found
  for (const [key, child] of Object.entries(value)) {
    if (path.length >= 8 || found.length >= 100) break
    const nextPath = [...path, key]
    if (/video/i.test(key)) {
      collectFromVideoField(child)
    } else if (!['description', 'short_description', 'price_html', 'add_to_cart', 'extensions'].includes(key)) {
      collectVideoReferences(child, nextPath, found)
    }
  }
  return found
}

function boundedSourceObject(value: unknown, depth = 0): unknown {
  if (depth > 8) throw new Error('The ISK Lenses catalog returned excessively nested product data.')
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value
  if (typeof value === 'string') {
    if (value.length > 20_000) throw new Error('The ISK Lenses catalog returned an oversized product field.')
    return value
  }
  if (Array.isArray(value)) {
    if (value.length > 200) throw new Error('The ISK Lenses catalog returned too many values in a product field.')
    return value.map((item) => boundedSourceObject(item, depth + 1))
  }
  if (!isRecord(value)) throw new Error('The ISK Lenses catalog returned an unsupported product field.')
  const output: Record<string, unknown> = {}
  const excludedFields = new Set(['description', 'short_description', 'price_html', 'add_to_cart', 'extensions', 'alt'])
  for (const [key, field] of Object.entries(value)) {
    if (excludedFields.has(key) || /video/i.test(key)) continue
    output[key] = boundedSourceObject(field, depth + 1)
  }
  return output
}

function boundedIskProduct(value: unknown) {
  if (!isRecord(value) || typeof value.id !== 'number' ||
      !Number.isSafeInteger(value.id) || value.id < 1 || value.id > 2_147_483_647) {
    throw new Error('The ISK Lenses catalog returned an invalid product.')
  }
  const name = requireText(value.name, 'Imported product name', 180)
  const slug = requireText(value.slug, 'Imported product slug', 180)
  if (!slugPattern.test(slug)) throw new Error('The ISK Lenses catalog returned an invalid product slug.')

  let sourceUrl: URL
  try {
    sourceUrl = new URL(requireText(value.permalink, 'Imported product link', 2048))
  } catch {
    throw new Error('The ISK Lenses catalog returned an invalid product link.')
  }
  if (sourceUrl.protocol !== 'https:' || !['isklenses.com', 'www.isklenses.com'].includes(sourceUrl.hostname) ||
      !sourceUrl.pathname.startsWith('/product/')) {
    throw new Error('The ISK Lenses catalog returned a link outside its product pages.')
  }

  if (!isRecord(value.prices)) throw new Error('The ISK Lenses catalog returned an invalid product price.')
  const minorUnit = value.prices.currency_minor_unit
  const currency = value.prices.currency_code
  if (typeof minorUnit !== 'number' || !Number.isSafeInteger(minorUnit) || minorUnit < 0 || minorUnit > 2 ||
      typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency)) {
    throw new Error('The ISK Lenses catalog returned an unsupported price format.')
  }
  const prices = boundedSourceObject(value.prices)
  const currentPrice = formatSourcePrice(value.prices.price, minorUnit)
  const regularPrice = typeof value.prices.regular_price === 'string' && /^\d+$/.test(value.prices.regular_price)
    ? formatSourcePrice(value.prices.regular_price, minorUnit)
    : null
  const salePrice = typeof value.prices.sale_price === 'string' && /^\d+$/.test(value.prices.sale_price)
    ? formatSourcePrice(value.prices.sale_price, minorUnit)
    : null

  const sourceCategory = Array.isArray(value.categories)
    ? value.categories.find((item) =>
        isRecord(item) &&
        typeof item.name === 'string' &&
        item.name.trim().length > 0 &&
        item.name.length <= 100,
      )
    : undefined
  const category = sourceCategory ? requireText(sourceCategory.name, 'Imported product category', 100) : 'Uncategorized'
  const images = Array.isArray(value.images)
    ? value.images.filter(isRecord).slice(0, 100).map((image) => {
        const source = safeSourceMediaUrl(image.src)
        if (!source || !['isklenses.com', 'www.isklenses.com'].includes(new URL(source).hostname)) {
          throw new Error('The ISK Lenses catalog returned an invalid product image reference.')
        }
        return {
          id: typeof image.id === 'number' && Number.isSafeInteger(image.id) ? image.id : null,
          src: source,
          thumbnail: safeSourceMediaUrl(image.thumbnail),
          srcset: typeof image.srcset === 'string' && image.srcset.length <= 20_000 ? image.srcset : null,
          sizes: typeof image.sizes === 'string' && image.sizes.length <= 2_000 ? image.sizes : null,
          name: typeof image.name === 'string' && image.name.length <= 500 ? image.name : null,
        }
      })
    : []
  const mediaReferences = {
    images,
    videos: collectVideoReferences(value),
  }
  const sourcePayload = {
    ...(boundedSourceObject(value) as Record<string, unknown>),
    prices: {
      ...(isRecord(prices) ? prices : {}),
      current: currentPrice,
      regular: regularPrice,
      sale: salePrice,
    },
    images: mediaReferences.images,
    categories: Array.isArray(value.categories) ? boundedSourceObject(value.categories) : [],
    tags: Array.isArray(value.tags) ? boundedSourceObject(value.tags) : [],
    brands: Array.isArray(value.brands) ? boundedSourceObject(value.brands) : [],
    attributes: Array.isArray(value.attributes) ? boundedSourceObject(value.attributes) : [],
    variations: Array.isArray(value.variations) ? boundedSourceObject(value.variations) : [],
    specifications: extractSourceFacts(typeof value.description === 'string' ? value.description : ''),
    mediaReferences,
    sourceDescriptionAvailable: Boolean(
      typeof value.short_description === 'string' && value.short_description.trim() ||
      typeof value.description === 'string' && value.description.trim(),
    ),
    sourceDescriptionHash: createHash('sha256')
      .update(`${typeof value.short_description === 'string' ? value.short_description : ''}\u0000${typeof value.description === 'string' ? value.description : ''}`)
      .digest('hex'),
  }

  return {
    sourceProductId: value.id,
    sourceUrl: sourceUrl.toString(),
    sourceImageUrl: mediaReferences.images[0]?.src ?? null,
    name,
    slug,
    category,
    price: currentPrice,
    currency,
    sourceContentHash: sourcePayload.sourceDescriptionHash,
    sourcePayload,
  }
}

export async function beginIskCatalogReplacement() {
  await requireAdminSession('admin')
  const [run] = await db.transaction(async (tx) => {
    await tx.delete(storeProductImportRuns).where(
      sql`${storeProductImportRuns.updatedAt} < now() - interval '24 hours'`,
    )
    return tx.insert(storeProductImportRuns).values({}).returning()
  })
  return { runId: run.id, nextPage: run.nextPage }
}

async function readLimitedBody(response: Response, maximumBytes: number) {
  const declaredLength = Number(response.headers.get('content-length') ?? 0)
  if (declaredLength > maximumBytes) throw new Error('The ISK Lenses catalog page is too large to import safely.')
  if (!response.body) throw new Error('The ISK Lenses catalog returned an empty response.')
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    totalBytes += value.byteLength
    if (totalBytes > maximumBytes) {
      await reader.cancel()
      throw new Error('The ISK Lenses catalog page is too large to import safely.')
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}

function stagedProduct(value: unknown) {
  if (!isRecord(value) || !isRecord(value.sourcePayload) ||
      typeof value.sourceProductId !== 'number' || !Number.isSafeInteger(value.sourceProductId) ||
      typeof value.sourceUrl !== 'string' || typeof value.name !== 'string' ||
      typeof value.slug !== 'string' || typeof value.category !== 'string' ||
      typeof value.price !== 'string' || typeof value.currency !== 'string' ||
      typeof value.sourceContentHash !== 'string') {
    throw new Error('A staged source product is invalid; the existing catalog was not changed.')
  }
  return {
    sourceProductId: value.sourceProductId,
    sourceUrl: value.sourceUrl,
    sourceImageUrl: typeof value.sourceImageUrl === 'string' ? value.sourceImageUrl : null,
    sourcePayload: value.sourcePayload,
    sourceContentHash: value.sourceContentHash,
    name: value.name,
    slug: value.slug,
    category: value.category,
    price: value.price,
    currency: value.currency,
    description: null,
    heroImageUrl: null,
    stockQuantity: 0,
    status: 'draft' as const,
  }
}

export async function importIskCatalogPage(runId: string, page: number) {
  await requireAdminSession('admin')
  validateUuid(runId, 'Import run ID')
  if (!Number.isSafeInteger(page) || page < 1 || page > 100) {
    throw new Error('Import page must be between 1 and 100.')
  }
  const perPage = 50
  const [run] = await db
    .select()
    .from(storeProductImportRuns)
    .where(eq(storeProductImportRuns.id, runId))
    .limit(1)
  if (!run) throw new Error('Catalog replacement run was not found. Start a new import.')
  if (run.nextPage !== page) throw new Error(`Import page ${run.nextPage} must be processed next.`)

  const response = await fetch(
    `https://isklenses.com/wp-json/wc/store/v1/products?per_page=${perPage}&page=${page}`,
    { cache: 'no-store', signal: AbortSignal.timeout(20_000) },
  )
  if (!response.ok) {
    console.error('[admin-import] ISK catalog request failed', { status: response.status })
    throw new Error('The ISK Lenses catalog could not be reached. Try again shortly.')
  }
  const responseText = await readLimitedBody(response, 8_000_000)
  let payload: unknown
  try {
    payload = JSON.parse(responseText)
  } catch {
    throw new Error('The ISK Lenses catalog returned invalid JSON.')
  }
  if (!Array.isArray(payload) || payload.length > perPage) throw new Error('The ISK Lenses catalog returned an invalid page.')
  const products = payload.map(boundedIskProduct)
  const pageSourceIds = new Set<number>()
  const pageSlugs = new Set<string>()
  for (const product of products) {
    if (pageSourceIds.has(product.sourceProductId) || pageSlugs.has(product.slug)) {
      throw new Error('The ISK Lenses catalog page contains duplicate product identifiers.')
    }
    pageSourceIds.add(product.sourceProductId)
    pageSlugs.add(product.slug)
  }

  const hasMore = products.length === perPage
  if (hasMore && page === 100) {
    throw new Error('The source catalog exceeds the 5,000-product safety limit; the existing catalog was not changed.')
  }
  const result = await db.transaction(async (tx) => {
    const [lockedRun] = await tx
      .select()
      .from(storeProductImportRuns)
      .where(eq(storeProductImportRuns.id, runId))
      .limit(1)
      .for('update')
    if (!lockedRun || lockedRun.nextPage !== page) {
      throw new Error('The import run changed while this page was being fetched. Existing products were not changed.')
    }

    if (products.length) {
      const alreadyStaged = await tx
        .select({ sourceProductId: storeProductImportItems.sourceProductId })
        .from(storeProductImportItems)
        .where(and(eq(storeProductImportItems.runId, runId), inArray(storeProductImportItems.sourceProductId, products.map((product) => product.sourceProductId))))
        .limit(products.length)
      if (alreadyStaged.length) throw new Error('The source catalog repeated a product across pages; replacement was stopped.')
      await tx.insert(storeProductImportItems).values(products.map((product) => ({
        runId,
        sourceProductId: product.sourceProductId,
        slug: product.slug,
        payload: product,
      })))
    }

    const importedCount = lockedRun.importedCount + products.length
    if (!hasMore) {
      const stagedRows = await tx
        .select({ payload: storeProductImportItems.payload })
        .from(storeProductImportItems)
        .where(eq(storeProductImportItems.runId, runId))
        .orderBy(asc(storeProductImportItems.sourceProductId))
      if (stagedRows.length !== importedCount || stagedRows.length === 0) {
        throw new Error('The source catalog was incomplete or empty; the existing product catalog was not changed.')
      }

      const [orderReferences] = await tx
        .select({ total: sql<number>`count(*)::int` })
        .from(storeOrderItems)
        .innerJoin(storeProducts, eq(storeOrderItems.productId, storeProducts.id))
      if (Number(orderReferences.total) > 0) {
        throw new Error('Existing order items reference products. The catalog was not replaced to preserve order history.')
      }

      const [previousProductCount] = await tx
        .select({ total: sql<number>`count(*)::int` })
        .from(storeProducts)
      const previousAssets = await tx
        .select({ blobUrl: storeProductAssets.blobUrl })
        .from(storeProductAssets)
      await tx.delete(storeProductAssets)
      await tx.delete(storeProducts)
      const replacementProducts = stagedRows.map(({ payload }) => stagedProduct(payload))
      for (let offset = 0; offset < replacementProducts.length; offset += 50) {
        const batch = replacementProducts.slice(offset, offset + 50)
        const inserted = await tx.insert(storeProducts).values(batch).returning({
          id: storeProducts.id,
          sourceProductId: storeProducts.sourceProductId,
        })
        await tx.insert(storeActivityEvents).values(inserted.map((product) => ({
          entityType: 'product',
          entityId: product.id,
          eventType: 'imported',
          payload: { sourceProductId: product.sourceProductId },
        })))
      }
      await tx.insert(storeActivityEvents).values({
        entityType: 'catalog',
        entityId: randomUUID(),
        eventType: 'replaced',
        payload: { importedCount: replacementProducts.length, removedCount: Number(previousProductCount.total) },
      })
      await tx.delete(storeProductImportRuns).where(eq(storeProductImportRuns.id, runId))
      return {
        page,
        imported: replacementProducts.length,
        deleted: Number(previousProductCount.total),
        hasMore: false,
        previousAssetUrls: previousAssets.flatMap(({ blobUrl }) => blobUrl ? [blobUrl] : []),
      }
    }

    await tx.update(storeProductImportRuns)
      .set({ nextPage: page + 1, importedCount, updatedAt: new Date() })
      .where(eq(storeProductImportRuns.id, runId))
    return { page, imported: products.length, deleted: 0, hasMore: true, previousAssetUrls: [] as string[] }
  })

  let mediaCleanupFailures = 0
  for (let offset = 0; offset < result.previousAssetUrls.length; offset += 50) {
    try {
      await del(result.previousAssetUrls.slice(offset, offset + 50))
    } catch (error) {
      mediaCleanupFailures += result.previousAssetUrls.slice(offset, offset + 50).length
      console.error('[admin-import] Replaced catalog media cleanup failed', error instanceof Error ? error.name : 'UnknownError')
    }
  }
  return {
    page: result.page,
    imported: result.imported,
    deleted: result.deleted,
    hasMore: result.hasMore,
    mediaCleanupFailures,
  }
}

export async function updateProduct(
  productId: string,
  data: Partial<ProductInput> & { heroImageUrl?: string | null },
) {
  await requireAdminSession('admin')
  if (!data || typeof data !== 'object') throw new Error('Product changes are required.')
  validateUuid(productId, 'Product ID')
  if (data.price !== undefined || data.currency !== undefined || data.stockQuantity !== undefined) {
    const [variant] = await db
      .select({ id: storeProductVariants.id })
      .from(storeProductVariants)
      .where(and(eq(storeProductVariants.productId, productId), eq(storeProductVariants.isActive, true)))
      .limit(1)
    if (variant) throw new Error('Manage price and stock on active variants for this product.')
  }

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
  await requireAdminSession('admin')
  validateUuid(productId, 'Product ID')
  return updateProduct(productId, { status: 'archived' })
}

export async function updateProductStock(productId: string, quantity: number) {
  await requireAdminSession('admin')
  validateUuid(productId, 'Product ID')
  if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error('Stock quantity must be a non-negative whole number.')
  const [variant] = await db
    .select({ id: storeProductVariants.id })
    .from(storeProductVariants)
    .where(and(eq(storeProductVariants.productId, productId), eq(storeProductVariants.isActive, true)))
    .limit(1)
  if (variant) throw new Error('Manage stock on active variants for this product.')

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
  mediaType: 'image' | 'video' = 'image',
) {
  await requireAdminSession('admin')
  validateUuid(productId, 'Product ID')
  const pathname = requireText(blobPathname, 'Blob path', 500)
  if (altText !== undefined && typeof altText !== 'string') throw new Error('Image description is invalid.')
  const text = altText?.trim() || null
  if (text && text.length > 500) throw new Error('Image description must be at most 500 characters.')
  if (mediaType !== 'image' && mediaType !== 'video') throw new Error('Media type is invalid.')
  const url = new URL(blobUrl)
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.blob.vercel-storage.com')) {
    throw new Error('Only public Vercel Blob image URLs can be saved.')
  }

  return db.transaction(async (tx) => {
    const [product] = await tx.select().from(storeProducts).where(eq(storeProducts.id, productId)).limit(1)
    if (!product) throw new Error('Product not found.')
    const [lastAsset] = await tx
      .select({ sortOrder: storeProductAssets.sortOrder })
      .from(storeProductAssets)
      .where(eq(storeProductAssets.productId, productId))
      .orderBy(desc(storeProductAssets.sortOrder))
      .limit(1)

    const [asset] = await tx
      .insert(storeProductAssets)
      .values({
        productId,
        blobPathname: pathname,
        blobUrl: url.toString(),
        altText: text,
        mediaType,
        sortOrder: (lastAsset?.sortOrder ?? -1) + 1,
      })
      .returning()
    if (mediaType === 'image' && !product.heroImageUrl) {
      await tx.update(storeProducts).set({ heroImageUrl: asset.blobUrl, updatedAt: new Date() }).where(eq(storeProducts.id, productId))
    }
    await tx.insert(storeActivityEvents).values({
      entityType: 'product_asset',
      entityId: asset.id,
      eventType: 'created',
      payload: { productId, mediaType },
    })
    return asset
  })
}

export async function moveProductAsset(assetId: string, direction: 'up' | 'down') {
  await requireAdminSession('admin')
  validateUuid(assetId, 'Asset ID')
  if (direction !== 'up' && direction !== 'down') throw new Error('Media direction is invalid.')
  return db.transaction(async (tx) => {
    const [asset] = await tx.select().from(storeProductAssets).where(eq(storeProductAssets.id, assetId)).limit(1)
    if (!asset) throw new Error('Product media not found.')
    const assets = await tx
      .select()
      .from(storeProductAssets)
      .where(eq(storeProductAssets.productId, asset.productId))
      .orderBy(asc(storeProductAssets.sortOrder), asc(storeProductAssets.createdAt))
    const index = assets.findIndex((item) => item.id === assetId)
    const neighbor = assets[index + (direction === 'up' ? -1 : 1)]
    if (!neighbor) return asset
    const reordered = [...assets]
    ;[reordered[index], reordered[index + (direction === 'up' ? -1 : 1)]] = [
      reordered[index + (direction === 'up' ? -1 : 1)],
      reordered[index],
    ]
    for (const [sortOrder, item] of reordered.entries()) {
      await tx.update(storeProductAssets).set({ sortOrder }).where(eq(storeProductAssets.id, item.id))
    }
    await tx.insert(storeActivityEvents).values({
      entityType: 'product_asset',
      entityId: asset.id,
      eventType: 'reordered',
      payload: { productId: asset.productId, direction },
    })
    return { ...asset, sortOrder: reordered.findIndex((item) => item.id === assetId) }
  })
}

export async function getProductAssetById(assetId: string) {
  await requireAdminSession()
  validateUuid(assetId, 'Asset ID')
  const [asset] = await db.select().from(storeProductAssets).where(eq(storeProductAssets.id, assetId)).limit(1)
  return asset ?? null
}

export async function deleteProductAsset(assetId: string) {
  await requireAdminSession('admin')
  validateUuid(assetId, 'Asset ID')

  return db.transaction(async (tx) => {
    const [asset] = await tx.select().from(storeProductAssets).where(eq(storeProductAssets.id, assetId)).limit(1)
    if (!asset) throw new Error('Product image not found.')

    await tx.delete(storeProductAssets).where(eq(storeProductAssets.id, assetId))
    const [product] = await tx.select().from(storeProducts).where(eq(storeProducts.id, asset.productId)).limit(1)
    if (product?.heroImageUrl === asset.blobUrl && asset.mediaType === 'image') {
      const [nextAsset] = await tx
        .select()
        .from(storeProductAssets)
        .where(and(eq(storeProductAssets.productId, asset.productId), eq(storeProductAssets.mediaType, 'image')))
        .orderBy(asc(storeProductAssets.sortOrder))
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
  await requireAdminSession('admin')
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
  await requireAdminSession('admin')
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

const systemUserRoles = ['admin', 'staff'] as const

function validateSystemUserEmail(email: unknown) {
  if (typeof email !== 'string') throw new Error('A valid email address is required.')
  const normalizedEmail = email.trim().toLowerCase()
  if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('A valid email address is required.')
  }
  return normalizedEmail
}

export async function getSystemUsers() {
  await requireAdminSession('owner')
  return db
    .select({
      id: storeAdminUsers.id,
      email: storeAdminUsers.email,
      role: storeAdminUsers.role,
      isActive: storeAdminUsers.isActive,
      lastLoginAt: storeAdminUsers.lastLoginAt,
      createdAt: storeAdminUsers.createdAt,
    })
    .from(storeAdminUsers)
    .orderBy(desc(storeAdminUsers.createdAt))
}

export async function createSystemUser(input: { email: string; password: string; role: string }) {
  const actor = await requireAdminSession('owner')
  if (!input || typeof input !== 'object') throw new Error('System user details are required.')
  const email = validateSystemUserEmail(input?.email)
  if (!systemUserRoles.includes(input?.role as (typeof systemUserRoles)[number])) {
    throw new Error('Choose an admin or staff account role.')
  }
  if (typeof input.password !== 'string') throw new Error('A password is required.')
  const passwordHash = await hashAdminPassword(input.password)

  try {
    return await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(storeAdminUsers)
        .values({ email, passwordHash, role: input.role })
        .returning({
          id: storeAdminUsers.id,
          email: storeAdminUsers.email,
          role: storeAdminUsers.role,
          isActive: storeAdminUsers.isActive,
          lastLoginAt: storeAdminUsers.lastLoginAt,
          createdAt: storeAdminUsers.createdAt,
        })
      await tx.insert(storeActivityEvents).values({
        entityType: 'admin_user',
        entityId: user.id,
        eventType: 'created',
        payload: { role: user.role, actorId: actor.userId },
      })
      return user
    })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      throw new Error('A system user with that email already exists.')
    }
    throw error
  }
}

export async function setSystemUserActive(userId: string, isActive: boolean) {
  const actor = await requireAdminSession('owner')
  validateUuid(userId, 'System user ID')
  if (typeof isActive !== 'boolean') throw new Error('Account status is invalid.')
  if (userId === actor.userId && !isActive) throw new Error('You cannot deactivate your own account.')

  return db.transaction(async (tx) => {
    const [target] = await tx.select().from(storeAdminUsers).where(eq(storeAdminUsers.id, userId)).limit(1)
    if (!target) throw new Error('System user not found.')
    if (target.role === 'owner' && target.isActive && !isActive) {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(731824615)`)
      const [owners] = await tx
        .select({ total: sql<number>`count(*)::int` })
        .from(storeAdminUsers)
        .where(and(eq(storeAdminUsers.role, 'owner'), eq(storeAdminUsers.isActive, true)))
      if (owners.total <= 1) throw new Error('The last active owner account cannot be deactivated.')
    }

    const [user] = await tx
      .update(storeAdminUsers)
      .set({ isActive, sessionVersion: sql`${storeAdminUsers.sessionVersion} + 1`, updatedAt: new Date() })
      .where(eq(storeAdminUsers.id, userId))
      .returning({
        id: storeAdminUsers.id,
        email: storeAdminUsers.email,
        role: storeAdminUsers.role,
        isActive: storeAdminUsers.isActive,
        lastLoginAt: storeAdminUsers.lastLoginAt,
        createdAt: storeAdminUsers.createdAt,
      })
    await tx.insert(storeActivityEvents).values({
      entityType: 'admin_user',
      entityId: userId,
      eventType: isActive ? 'activated' : 'deactivated',
      payload: { role: user.role, actorId: actor.userId },
    })
    return user
  })
}

export async function updateOwnSystemUserCredentials(input: { email: string; password?: string }) {
  const actor = await requireAdminSession('owner')
  if (!input || typeof input !== 'object') throw new Error('Account details are required.')
  const email = validateSystemUserEmail(input.email)
  if (input.password !== undefined && typeof input.password !== 'string') {
    throw new Error('Password is invalid.')
  }
  if (email === actor.email && !input.password) throw new Error('Enter a new email or password before saving.')
  const changes: Partial<typeof storeAdminUsers.$inferInsert> = { email }
  if (input.password) changes.passwordHash = await hashAdminPassword(input.password)

  try {
    await db.transaction(async (tx) => {
      const [user] = await tx
        .update(storeAdminUsers)
        .set({
          ...changes,
          sessionVersion: sql`${storeAdminUsers.sessionVersion} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(storeAdminUsers.id, actor.userId))
        .returning({ id: storeAdminUsers.id })
      if (!user) throw new Error('Owner account not found.')
      await tx.insert(storeActivityEvents).values({
        entityType: 'admin_user',
        entityId: user.id,
        eventType: 'credentials_updated',
        payload: { actorId: actor.userId, emailChanged: email !== actor.email, passwordChanged: Boolean(input.password) },
      })
    })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      throw new Error('A system user with that email already exists.')
    }
    throw error
  }
  await clearAdminSession()
  return { email }
}

'use server'

import { asc, eq, sql } from 'drizzle-orm'
import { invalidateCache } from '@/lib/cache'
import { requireAdminSession } from '@/lib/auth/admin'
import { db } from '@/lib/db'
import { storeBrands, storeErrorLogs, storeLensShades, storeProducts } from '@/lib/db/schema'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function requiredText(value: unknown, label: string, max: number) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`)
  const result = value.trim()
  if (result.length > max) throw new Error(`${label} must be ${max} characters or fewer.`)
  return result
}

function assertId(value: string) {
  if (!uuidPattern.test(value)) throw new Error('Invalid record ID.')
  return value
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100)
}

function bustCatalog() {
  invalidateCache('catalog')
  invalidateCache('content')
}

export async function getAdminBrands() {
  await requireAdminSession('staff')
  return db.select().from(storeBrands).orderBy(asc(storeBrands.name))
}

export async function saveBrand(input: { id?: string; name: unknown; logoUrl?: unknown; isActive?: boolean }) {
  await requireAdminSession('admin')
  const name = requiredText(input.name, 'Name', 100)
  const id = input.id ? assertId(input.id) : null
  const slug = slugify(name)
  if (!slug) throw new Error('Brand name must contain letters or numbers.')
  const logoUrl = input.logoUrl == null || input.logoUrl === '' ? null : requiredText(input.logoUrl, 'Brand logo', 2048)
  if (logoUrl) {
    let parsed: URL
    try {
      parsed = new URL(logoUrl)
    } catch {
      throw new Error('Brand logo must be uploaded to Vercel Blob.')
    }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password ||
        !/^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/i.test(parsed.hostname)) {
      throw new Error('Brand logo must be uploaded to Vercel Blob.')
    }
  }
  const values = { name, slug, logoUrl, isActive: input.isActive !== false, updatedAt: new Date() }
  try {
    if (id) {
      const [row] = await db.update(storeBrands).set(values).where(eq(storeBrands.id, id)).returning({ id: storeBrands.id })
      if (!row) throw new Error('Brand not found.')
    } else {
      await db.insert(storeBrands).values(values)
    }
  } catch (error) {
    if (String((error as { code?: string }).code) === '23505') throw new Error('A brand with that name already exists.')
    throw error
  }
  bustCatalog()
}

export async function deleteBrand(id: string) {
  await requireAdminSession('admin')
  assertId(id)
  await db.transaction(async (tx) => {
    await tx.update(storeProducts).set({ brandId: null, brand: null }).where(eq(storeProducts.brandId, id))
    await tx.delete(storeBrands).where(eq(storeBrands.id, id))
  })
  bustCatalog()
}

export async function getAdminLensShades() {
  await requireAdminSession('staff')
  return db.select().from(storeLensShades).orderBy(asc(storeLensShades.name))
}

export async function saveLensShade(input: { id?: string; name: unknown; hex: unknown; isActive?: boolean }) {
  await requireAdminSession('admin')
  const name = requiredText(input.name, 'Name', 80)
  const hex = input.hex == null || input.hex === '' ? null : input.hex
  if (hex !== null && (typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex))) throw new Error('Choose a valid shade color.')
  const id = input.id ? assertId(input.id) : null
  const values = { name, hex: typeof hex === 'string' ? hex.toLowerCase() : null, isActive: input.isActive !== false, updatedAt: new Date() }
  try {
    if (id) {
      const [row] = await db.update(storeLensShades).set(values).where(eq(storeLensShades.id, id)).returning({ id: storeLensShades.id })
      if (!row) throw new Error('Lens shade not found.')
    } else {
      await db.insert(storeLensShades).values(values)
    }
  } catch (error) {
    if (String((error as { code?: string }).code) === '23505') throw new Error('That shade name and color already exist.')
    throw error
  }
  bustCatalog()
}

export async function deleteLensShade(id: string) {
  await requireAdminSession('admin')
  assertId(id)
  await db.delete(storeLensShades).where(eq(storeLensShades.id, id))
  bustCatalog()
}

export async function getRecentErrorLogs() {
  await requireAdminSession('staff')
  await db.delete(storeErrorLogs).where(sql`${storeErrorLogs.createdAt} < now() - interval '1 day'`)
  return db.select().from(storeErrorLogs).orderBy(sql`${storeErrorLogs.createdAt} desc`).limit(200)
}

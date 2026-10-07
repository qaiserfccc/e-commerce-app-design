'use server'

import { db } from '@/lib/db'
import {
  storeProducts,
  storeCustomers,
  storeOrders,
  storeOrderItems,
  storeProductAssets,
  storeActivityEvents,
} from '@/lib/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

/**
 * Admin workspace data access layer - READ/WRITE operations
 * All operations require authentication (should be wrapped with auth checks at route level)
 */

// ===== PRODUCTS =====

export async function getAllProducts() {
  try {
    return await db.select().from(storeProducts).orderBy(desc(storeProducts.updatedAt))
  } catch (error) {
    console.error('[v0] Error fetching all products:', error)
    throw new Error('Failed to fetch products')
  }
}

export async function createProduct(data: {
  name: string
  slug: string
  description?: string
  category: string
  price: string
  currency?: string
  stockQuantity?: number
  status?: string
  heroImageUrl?: string
}) {
  try {
    const [product] = await db
      .insert(storeProducts)
      .values({
        ...data,
        currency: data.currency || 'USD',
        status: data.status || 'active',
        stockQuantity: data.stockQuantity || 0,
      })
      .returning()

    // Log activity
    await db.insert(storeActivityEvents).values({
      entityType: 'product',
      entityId: product.id,
      eventType: 'created',
      payload: { productName: product.name },
    })

    return product
  } catch (error) {
    console.error('[v0] Error creating product:', error)
    throw new Error('Failed to create product')
  }
}

export async function updateProduct(productId: string, data: Partial<typeof storeProducts.$inferInsert>) {
  try {
    const [updated] = await db
      .update(storeProducts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(storeProducts.id, productId))
      .returning()

    // Log activity
    await db.insert(storeActivityEvents).values({
      entityType: 'product',
      entityId: productId,
      eventType: 'updated',
      payload: { changes: data },
    })

    return updated
  } catch (error) {
    console.error('[v0] Error updating product:', error)
    throw new Error('Failed to update product')
  }
}

export async function deleteProduct(productId: string) {
  try {
    // Delete associated assets
    await db.delete(storeProductAssets).where(eq(storeProductAssets.productId, productId))

    // Delete product
    await db.delete(storeProducts).where(eq(storeProducts.id, productId))

    // Log activity
    await db.insert(storeActivityEvents).values({
      entityType: 'product',
      entityId: productId,
      eventType: 'deleted',
      payload: {},
    })

    return { success: true }
  } catch (error) {
    console.error('[v0] Error deleting product:', error)
    throw new Error('Failed to delete product')
  }
}

export async function updateProductStock(productId: string, quantity: number) {
  try {
    const [updated] = await db
      .update(storeProducts)
      .set({
        stockQuantity: quantity,
        updatedAt: new Date(),
      })
      .where(eq(storeProducts.id, productId))
      .returning()

    // Log activity
    await db.insert(storeActivityEvents).values({
      entityType: 'product',
      entityId: productId,
      eventType: 'stock_updated',
      payload: { newQuantity: quantity },
    })

    return updated
  } catch (error) {
    console.error('[v0] Error updating stock:', error)
    throw new Error('Failed to update stock')
  }
}

// ===== PRODUCT ASSETS =====

export async function addProductAsset(productId: string, blobPathname: string, blobUrl: string, altText?: string, sortOrder?: number) {
  try {
    const [asset] = await db
      .insert(storeProductAssets)
      .values({
        productId,
        blobPathname,
        blobUrl,
        altText: altText || null,
        sortOrder: sortOrder || 0,
      })
      .returning()

    // Log activity
    await db.insert(storeActivityEvents).values({
      entityType: 'product_asset',
      entityId: asset.id,
      eventType: 'created',
      payload: { productId },
    })

    return asset
  } catch (error) {
    console.error('[v0] Error adding product asset:', error)
    throw new Error('Failed to add product asset')
  }
}

export async function deleteProductAsset(assetId: string) {
  try {
    await db.delete(storeProductAssets).where(eq(storeProductAssets.id, assetId))

    // Log activity
    await db.insert(storeActivityEvents).values({
      entityType: 'product_asset',
      entityId: assetId,
      eventType: 'deleted',
      payload: {},
    })

    return { success: true }
  } catch (error) {
    console.error('[v0] Error deleting product asset:', error)
    throw new Error('Failed to delete product asset')
  }
}

// ===== ORDERS =====

export async function getAllOrders(limit = 50) {
  try {
    return await db
      .select()
      .from(storeOrders)
      .orderBy(desc(storeOrders.createdAt))
      .limit(limit)
  } catch (error) {
    console.error('[v0] Error fetching all orders:', error)
    throw new Error('Failed to fetch orders')
  }
}

export async function getOrderStats() {
  try {
    const result = await db
      .select({
        totalOrders: sql<number>`COUNT(*)`,
        totalRevenue: sql<string>`COALESCE(SUM(${storeOrders.total}), '0')`,
        avgOrderValue: sql<string>`COALESCE(AVG(${storeOrders.total}), '0')`,
      })
      .from(storeOrders)

    return result[0]
  } catch (error) {
    console.error('[v0] Error fetching order stats:', error)
    throw new Error('Failed to fetch order stats')
  }
}

export async function updateOrderStatus(orderId: string, status: string) {
  try {
    const [updated] = await db
      .update(storeOrders)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(storeOrders.id, orderId))
      .returning()

    // Log activity
    await db.insert(storeActivityEvents).values({
      entityType: 'order',
      entityId: orderId,
      eventType: 'status_updated',
      payload: { newStatus: status },
    })

    return updated
  } catch (error) {
    console.error('[v0] Error updating order status:', error)
    throw new Error('Failed to update order status')
  }
}

// ===== CUSTOMERS =====

export async function getAllCustomers(limit = 100) {
  try {
    return await db
      .select()
      .from(storeCustomers)
      .orderBy(desc(storeCustomers.createdAt))
      .limit(limit)
  } catch (error) {
    console.error('[v0] Error fetching all customers:', error)
    throw new Error('Failed to fetch customers')
  }
}

export async function getCustomerStats() {
  try {
    const result = await db
      .select({
        totalCustomers: sql<number>`COUNT(*)`,
      })
      .from(storeCustomers)

    return result[0]
  } catch (error) {
    console.error('[v0] Error fetching customer stats:', error)
    throw new Error('Failed to fetch customer stats')
  }
}

export async function updateCustomer(customerId: string, data: Partial<typeof storeCustomers.$inferInsert>) {
  try {
    const [updated] = await db
      .update(storeCustomers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(storeCustomers.id, customerId))
      .returning()

    // Log activity
    await db.insert(storeActivityEvents).values({
      entityType: 'customer',
      entityId: customerId,
      eventType: 'updated',
      payload: { changes: data },
    })

    return updated
  } catch (error) {
    console.error('[v0] Error updating customer:', error)
    throw new Error('Failed to update customer')
  }
}

// ===== ANALYTICS & REPORTS =====

export async function getRecentActivity(limit = 20) {
  try {
    return await db
      .select()
      .from(storeActivityEvents)
      .orderBy(desc(storeActivityEvents.createdAt))
      .limit(limit)
  } catch (error) {
    console.error('[v0] Error fetching activity:', error)
    throw new Error('Failed to fetch activity')
  }
}

export async function getDashboardMetrics() {
  try {
    const [orders, customers] = await Promise.all([getOrderStats(), getCustomerStats()])

    return {
      orders: orders || { totalOrders: 0, totalRevenue: '0', avgOrderValue: '0' },
      customers: customers || { totalCustomers: 0 },
    }
  } catch (error) {
    console.error('[v0] Error fetching dashboard metrics:', error)
    throw new Error('Failed to fetch metrics')
  }
}

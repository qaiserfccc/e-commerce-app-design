'use server'

import { db } from '@/lib/db'
import { storeProducts, storeCustomers, storeOrders, storeOrderItems, storeProductAssets } from '@/lib/db/schema'
import { eq, desc, asc, like, and } from 'drizzle-orm'

/**
 * Storefront data access layer - READ operations
 * All operations are public (no auth required for storefront viewing)
 */

export async function getActiveProducts() {
  try {
    return await db
      .select()
      .from(storeProducts)
      .where(eq(storeProducts.status, 'active'))
      .orderBy(desc(storeProducts.createdAt))
  } catch (error) {
    console.error('[v0] Error fetching products:', error)
    throw new Error('Failed to fetch products')
  }
}

export async function getProductBySlug(slug: string) {
  try {
    const product = await db
      .select()
      .from(storeProducts)
      .where(and(eq(storeProducts.slug, slug), eq(storeProducts.status, 'active')))
      .limit(1)

    return product[0] || null
  } catch (error) {
    console.error('[v0] Error fetching product by slug:', error)
    throw new Error('Failed to fetch product')
  }
}

export async function getProductsByCategory(category: string) {
  try {
    return await db
      .select()
      .from(storeProducts)
      .where(and(eq(storeProducts.category, category), eq(storeProducts.status, 'active')))
      .orderBy(desc(storeProducts.createdAt))
  } catch (error) {
    console.error('[v0] Error fetching products by category:', error)
    throw new Error('Failed to fetch products')
  }
}

export async function searchProducts(query: string) {
  try {
    return await db
      .select()
      .from(storeProducts)
      .where(
        and(
          eq(storeProducts.status, 'active'),
          like(storeProducts.name, `%${query}%`),
        ),
      )
      .orderBy(desc(storeProducts.createdAt))
      .limit(20)
  } catch (error) {
    console.error('[v0] Error searching products:', error)
    throw new Error('Failed to search products')
  }
}

export async function getProductAssets(productId: string) {
  try {
    return await db
      .select()
      .from(storeProductAssets)
      .where(eq(storeProductAssets.productId, productId))
      .orderBy(asc(storeProductAssets.sortOrder))
  } catch (error) {
    console.error('[v0] Error fetching product assets:', error)
    throw new Error('Failed to fetch product assets')
  }
}

export async function getOrCreateCustomer(email: string, firstName?: string, lastName?: string) {
  try {
    const existing = await db
      .select()
      .from(storeCustomers)
      .where(eq(storeCustomers.email, email))
      .limit(1)

    if (existing[0]) {
      return existing[0]
    }

    const [newCustomer] = await db
      .insert(storeCustomers)
      .values({
        email,
        firstName: firstName || null,
        lastName: lastName || null,
      })
      .returning()

    return newCustomer
  } catch (error) {
    console.error('[v0] Error creating customer:', error)
    throw new Error('Failed to create customer')
  }
}

export async function createOrder(
  customerId: string,
  items: Array<{
    productId: string
    productName: string
    unitPrice: string
    quantity: number
    lineTotal: string
  }>,
  subtotal: string,
  shippingTotal: string,
  taxTotal: string,
  total: string,
  shippingAddress: Record<string, any>,
) {
  try {
    const [order] = await db
      .insert(storeOrders)
      .values({
        customerId,
        status: 'pending',
        subtotal,
        shippingTotal,
        taxTotal,
        total,
        shippingAddress,
      })
      .returning()

    const orderItems = await db
      .insert(storeOrderItems)
      .values(
        items.map((item) => ({
          orderId: order.id,
          ...item,
        })),
      )
      .returning()

    return { order, items: orderItems }
  } catch (error) {
    console.error('[v0] Error creating order:', error)
    throw new Error('Failed to create order')
  }
}

export async function getOrdersByCustomerEmail(email: string) {
  try {
    const customer = await db
      .select()
      .from(storeCustomers)
      .where(eq(storeCustomers.email, email))
      .limit(1)

    if (!customer[0]) {
      return []
    }

    return await db
      .select()
      .from(storeOrders)
      .where(eq(storeOrders.customerId, customer[0].id))
      .orderBy(desc(storeOrders.createdAt))
  } catch (error) {
    console.error('[v0] Error fetching customer orders:', error)
    throw new Error('Failed to fetch orders')
  }
}

export async function getOrderDetails(orderId: string) {
  try {
    const [order] = await db
      .select()
      .from(storeOrders)
      .where(eq(storeOrders.id, orderId))
      .limit(1)

    if (!order) {
      return null
    }

    const items = await db
      .select()
      .from(storeOrderItems)
      .where(eq(storeOrderItems.orderId, orderId))

    return { order, items }
  } catch (error) {
    console.error('[v0] Error fetching order details:', error)
    throw new Error('Failed to fetch order details')
  }
}

import { desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getCustomerSession } from '@/lib/auth/store-customer'
import { db } from '@/lib/db'
import { storeOrders } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

// Buyer-only: returns the signed-in customer's own orders. Guests get 401.
export async function GET() {
  try {
    const session = await getCustomerSession()
    if (!session) return NextResponse.json({ error: 'Sign in to view your orders.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
    const orders = await db
      .select({
        id: storeOrders.id,
        orderNumber: storeOrders.orderNumber,
        status: storeOrders.status,
        total: storeOrders.total,
        currency: storeOrders.currency,
        shippingFeeConfirmed: storeOrders.shippingFeeConfirmed,
        createdAt: storeOrders.createdAt,
      })
      .from(storeOrders)
      .where(eq(storeOrders.accountId, session.customerId))
      .orderBy(desc(storeOrders.createdAt))
      .limit(50)
    return NextResponse.json({ data: orders }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[customer-orders] Request failed', error instanceof Error ? error.name : 'UnknownError')
    return NextResponse.json({ error: 'Orders are temporarily unavailable.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}

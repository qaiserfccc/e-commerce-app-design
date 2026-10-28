import 'server-only'

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { storeSettings } from '@/lib/db/schema'
import { parseDeliveryRules } from '@/lib/delivery'

export async function getStorefrontDeliveryRules() {
  const [row] = await db.select({ value: storeSettings.value }).from(storeSettings).where(eq(storeSettings.key, 'delivery_rules')).limit(1)
  return parseDeliveryRules(row?.value ?? [])
}

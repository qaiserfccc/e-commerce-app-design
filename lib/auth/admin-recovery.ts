import 'server-only'

import { createHash, timingSafeEqual } from 'node:crypto'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { storeActivityEvents, storeAdminUsers } from '@/lib/db/schema'
import { hashAdminPassword } from '@/lib/auth/admin'

const MINIMUM_RECOVERY_KEY_LENGTH = 8

// Recovery key is stored in the database (store_secrets, name 'admin_recovery_key'); unset means disabled.
async function getRecoveryKey() {
  const result = await db.execute(sql`SELECT value FROM store_secrets WHERE name = 'admin_recovery_key'`)
  const rows = (Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows ?? []) as { value?: string }[]
  const key = rows[0]?.value
  return key && key.length >= MINIMUM_RECOVERY_KEY_LENGTH ? key : null
}

function constantTimeEqual(left: string, right: string) {
  const leftHash = createHash('sha256').update(left).digest()
  const rightHash = createHash('sha256').update(right).digest()
  return timingSafeEqual(leftHash, rightHash)
}

export async function isAdminRecoveryConfigured() {
  return (await getRecoveryKey()) !== null
}

/**
 * Resets an admin password when the caller proves possession of the stored recovery key.
 * Returns false for any wrong key or unknown email so callers cannot enumerate accounts.
 */
export async function resetAdminPasswordWithRecoveryKey(input: {
  email: string
  recoveryKey: string
  newPassword: string
}) {
  const expected = await getRecoveryKey()
  if (!expected) return false

  const keyMatches = constantTimeEqual(input.recoveryKey, expected)
  const email = input.email.trim().toLowerCase()
  const passwordHash = await hashAdminPassword(input.newPassword)
  if (!keyMatches || !email) return false

  return db.transaction(async (tx) => {
    const [user] = await tx
      .update(storeAdminUsers)
      .set({
        passwordHash,
        sessionVersion: sql`${storeAdminUsers.sessionVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(storeAdminUsers.email, email))
      .returning({ id: storeAdminUsers.id, role: storeAdminUsers.role })
    if (!user) return false

    await tx.insert(storeActivityEvents).values({
      entityType: 'admin_user',
      entityId: user.id,
      eventType: 'password_reset_recovery_key',
      payload: { role: user.role },
    })
    return true
  })
}

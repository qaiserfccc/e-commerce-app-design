import 'server-only'

import { createHash } from 'node:crypto'

type RateWindow = { count: number; resetAt: number }

const windows = new Map<string, RateWindow>()

export function consumePublicRateLimit(scope: string, identifier: string, limit: number, durationMs: number) {
  const now = Date.now()
  if (windows.size > 10_000) {
    for (const [key, value] of windows) {
      if (value.resetAt <= now) windows.delete(key)
    }
  }
  const key = `${scope}:${createHash('sha256').update(identifier).digest('hex')}`
  const current = windows.get(key)
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + durationMs })
    return true
  }
  if (current.count >= limit) return false
  current.count += 1
  return true
}

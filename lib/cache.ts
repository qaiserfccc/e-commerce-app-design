import 'server-only'

// Read-through cache. Uses Redis over the Upstash/Vercel KV REST API when
// configured, and falls back to a per-process memory cache otherwise.
// Every cache failure fails open to the database loader.

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
const REDIS_TIMEOUT_MS = 800
const PREFIX = 'isk:'

type MemoryEntry = { value: string; expiresAt: number }
const globalCache = globalThis as unknown as { iskMemoryCache?: Map<string, MemoryEntry>; iskMemoryVersions?: Map<string, number> }
const memory = (globalCache.iskMemoryCache ??= new Map())
const memoryVersions = (globalCache.iskMemoryVersions ??= new Map())

export const cacheBackend = redisUrl && redisToken ? 'redis' : 'memory'

async function redis<T = unknown>(command: Array<string | number>): Promise<T | null> {
  if (!redisUrl || !redisToken) return null
  try {
    const response = await fetch(redisUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
      cache: 'no-store',
      signal: AbortSignal.timeout(REDIS_TIMEOUT_MS),
    })
    if (!response.ok) return null
    const body = (await response.json()) as { result?: T }
    return body.result ?? null
  } catch {
    return null
  }
}

async function version(namespace: string) {
  if (cacheBackend === 'redis') {
    const value = await redis<string>(['GET', `${PREFIX}ver:${namespace}`])
    return value ?? '0'
  }
  return String(memoryVersions.get(namespace) ?? 0)
}

export async function cached<T>(namespace: string, key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const fullKey = `${PREFIX}${namespace}:${await version(namespace)}:${key}`
  if (cacheBackend === 'redis') {
    const hit = await redis<string>(['GET', fullKey])
    if (hit) {
      try { return JSON.parse(hit) as T } catch { /* fall through to loader */ }
    }
  } else {
    const hit = memory.get(fullKey)
    if (hit && hit.expiresAt > Date.now()) return JSON.parse(hit.value) as T
  }

  const value = await loader()
  const serialized = JSON.stringify(value)
  if (serialized !== undefined) {
    if (cacheBackend === 'redis') {
      void redis(['SET', fullKey, serialized, 'EX', ttlSeconds])
    } else {
      if (memory.size > 500) memory.clear()
      memory.set(fullKey, { value: serialized, expiresAt: Date.now() + ttlSeconds * 1000 })
    }
  }
  // Return the serialized shape on a miss so hits and misses look identical (e.g. dates as strings).
  return serialized === undefined ? value : (JSON.parse(serialized) as T)
}

// Bumps the namespace version so every key under it becomes unreachable.
export async function invalidateCache(...namespaces: string[]) {
  for (const namespace of namespaces) {
    if (cacheBackend === 'redis') await redis(['INCR', `${PREFIX}ver:${namespace}`])
    else memoryVersions.set(namespace, (memoryVersions.get(namespace) ?? 0) + 1)
  }
}

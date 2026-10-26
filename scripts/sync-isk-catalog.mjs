// Usage: node --env-file=.env.local scripts/sync-isk-catalog.mjs [products|brands|categories|lens-shades|all]
import { syncIskCatalog } from '../lib/server/isk-catalog-sync.mjs'

const entity = process.argv[2] ?? 'all'
const result = await syncIskCatalog(entity)
console.log(JSON.stringify(result, null, 2))
if (result.results.some((item) => Number(item.failed ?? 0) > 0 ||
    (Array.isArray(item.imageFailures) && item.imageFailures.length > 0))) {
  process.exitCode = 1
}

// Legacy taxonomy entry point; repeated runs are safe and reuse the shared catalog sync.
// Usage: node --env-file=.env.local scripts/import-isk-reference-taxonomy.mjs
import { syncIskCatalog } from '../lib/server/isk-catalog-sync.mjs'

const brands = await syncIskCatalog('brands')
const shades = await syncIskCatalog('lens-shades')
console.log(JSON.stringify({ brands: brands.results[0], lensShades: shades.results[0] }, null, 2))
if (shades.results.some((result) =>
  (Array.isArray(result.imageFailures) && result.imageFailures.length > 0))) {
  process.exitCode = 1
}

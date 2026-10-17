import 'server-only'

import {
  getActiveProductCategories,
  getActiveProductVariantsForProducts,
  getActiveProducts,
  getProductAssetsForProducts,
  getProductCategoryIdsForProducts,
  getProductsByCategory,
  searchProducts,
} from '@/app/actions/storefront'
import { cached } from '@/lib/cache'

export const CATALOG_NAMESPACE = 'catalog'

async function loadCatalog(category: string | null, query: string | null) {
  let products = query ? await searchProducts(query) : category ? await getProductsByCategory(category) : await getActiveProducts()
  if (query && category) products = products.filter((product) => product.category === category)

  const productIds = products.map((product) => product.id)
  const [assets, variants, categoryAssignments] = await Promise.all([
    getProductAssetsForProducts(productIds),
    getActiveProductVariantsForProducts(productIds),
    getProductCategoryIdsForProducts(productIds),
  ])
  const assetsByProduct = Map.groupBy(assets, (asset) => asset.productId)
  const variantsByProduct = Map.groupBy(variants, (variant) => variant.productId)
  const categoryIdsByProduct = new Map(categoryAssignments.map(({ productId, sourceCategoryIds }) => [productId, sourceCategoryIds]))
  return products.map((product) => ({
    ...product,
    assets: assetsByProduct.get(product.id) ?? [],
    variants: variantsByProduct.get(product.id) ?? [],
    sourceCategoryIds: categoryIdsByProduct.get(product.id) ?? [],
  }))
}

export function getCatalog(category: string | null = null, query: string | null = null) {
  return cached(CATALOG_NAMESPACE, `products:${category ?? ''}:${(query ?? '').toLowerCase()}`, 300, () => loadCatalog(category, query))
}

export function getCategories() {
  return cached(CATALOG_NAMESPACE, 'categories', 600, () => getActiveProductCategories())
}

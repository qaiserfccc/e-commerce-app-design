export const SECTION_SOURCES = ['manual', 'same_category', 'co_purchased', 'best_selling', 'recent_orders', 'featured', 'newest'] as const
export type SectionSource = (typeof SECTION_SOURCES)[number]

export const SECTION_SOURCE_LABELS: Record<SectionSource, string> = {
  manual: 'Hand-picked related products',
  same_category: 'Same category',
  co_purchased: 'Customers also bought (from orders)',
  best_selling: 'Best sellers',
  recent_orders: 'Recently ordered',
  featured: 'Featured products',
  newest: 'New arrivals',
}

export type ProductSection = { id: string; title: string; source: SectionSource; limit: number; enabled: boolean }

export type ProductPageSettings = {
  sections: ProductSection[]
  reviews: { enabled: boolean; allowSubmission: boolean; autoApprove: boolean }
}

export const DEFAULT_PRODUCT_PAGE: ProductPageSettings = {
  sections: [
    { id: 'related', title: 'Related products', source: 'manual', limit: 4, enabled: true },
    { id: 'bought', title: 'Customers also bought', source: 'co_purchased', limit: 4, enabled: true },
    { id: 'best', title: 'Best sellers', source: 'best_selling', limit: 4, enabled: true },
    { id: 'recent', title: 'Recently ordered', source: 'recent_orders', limit: 4, enabled: false },
  ],
  reviews: { enabled: true, allowSubmission: true, autoApprove: false },
}

export type CategoryNode = {
  id: string
  parentId: string | null
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  fallbackImageUrl: string | null
  sortOrder: number
  isActive: boolean
  showInMenu: boolean
  /** slug chain from root to this category */
  path: string
  depth: number
  productCount: number
}

export function buildCategoryPaths<T extends { id: string; parentId: string | null; slug: string }>(rows: T[]) {
  const byId = new Map(rows.map((row) => [row.id, row]))
  return rows.map((row) => {
    const chain: string[] = []
    const seen = new Set<string>()
    let current: T | undefined = row
    while (current && !seen.has(current.id)) {
      seen.add(current.id)
      chain.unshift(current.slug)
      current = current.parentId ? byId.get(current.parentId) : undefined
    }
    return { ...row, path: chain.join('/'), depth: chain.length - 1 }
  })
}

export function descendantIds(rows: { id: string; parentId: string | null }[], id: string) {
  const children = new Map<string, string[]>()
  for (const row of rows) {
    if (!row.parentId) continue
    const list = children.get(row.parentId) ?? []
    list.push(row.id)
    children.set(row.parentId, list)
  }
  const result = new Set<string>([id])
  const stack = [id]
  while (stack.length) for (const child of children.get(stack.pop()!) ?? []) if (!result.has(child)) { result.add(child); stack.push(child) }
  return result
}

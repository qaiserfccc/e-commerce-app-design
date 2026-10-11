'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Layers3 } from 'lucide-react'
import type { Product } from '@/lib/hooks/use-storefront-data'
import { useStorefrontCategories, type ProductCategory } from '@/lib/hooks/use-storefront-categories'

export function categoryBranchIds(categories: ProductCategory[], id: number | null) {
  if (id === null || id === -1) return new Set<number>()
  const children = new Map<number, ProductCategory[]>()
  for (const category of categories) {
    const siblings = children.get(category.parentSourceCategoryId) ?? []
    siblings.push(category)
    children.set(category.parentSourceCategoryId, siblings)
  }
  const result = new Set<number>([id])
  const visit = (parentId: number) => {
    for (const child of children.get(parentId) ?? []) {
      if (result.has(child.sourceCategoryId)) continue
      result.add(child.sourceCategoryId)
      visit(child.sourceCategoryId)
    }
  }
  visit(id)
  return result
}

export function productsInCategory(product: Product, categoryId: number | null, categoryIds: Set<number>) {
  if (categoryId === null) return true
  if (categoryId === -1) return product.category === 'Uncategorized'
  return (product.sourceCategoryIds ?? []).some((id) => categoryIds.has(id))
}

export function StorefrontCategoryNavigation({
  products,
  selectedCategoryId,
  onSelect,
}: {
  products: Product[]
  selectedCategoryId: number | null
  onSelect: (categoryId: number | null) => void
}) {
  const { categories, isLoading, isError } = useStorefrontCategories()
  const [expandedRootId, setExpandedRootId] = useState(17)
  const [expandedChildId, setExpandedChildId] = useState<number | null>(null)

  const children = useMemo(() => {
    const result = new Map<number, ProductCategory[]>()
    for (const category of categories) {
      const siblings = result.get(category.parentSourceCategoryId) ?? []
      siblings.push(category)
      result.set(category.parentSourceCategoryId, siblings)
    }
    for (const siblings of result.values()) siblings.sort((a, b) => a.name.localeCompare(b.name))
    return result
  }, [categories])

  const counts = useMemo(() => {
    const result = new Map<number, number>()
    const byId = new Map(categories.map((category) => [category.sourceCategoryId, category]))
    for (const product of products) {
      const assigned = new Set(product.sourceCategoryIds ?? [])
      for (const id of [...assigned]) {
        let category = byId.get(id)
      const visited = new Set<number>()
      while (category) {
        if (visited.has(category.sourceCategoryId)) break
        visited.add(category.sourceCategoryId)
        assigned.add(category.sourceCategoryId)
        category = byId.get(category.parentSourceCategoryId)
      }
      }
      for (const id of assigned) result.set(id, (result.get(id) ?? 0) + 1)
    }
    return result
  }, [categories, products])

  const roots = (children.get(0) ?? []).filter((category) =>
    category.sourceCategoryId !== 118 && (counts.get(category.sourceCategoryId) ?? 0) > 0,
  )
  const activeRoot = roots.find((category) => category.sourceCategoryId === expandedRootId) ?? roots[0]
  const rootChildren = activeRoot ? (children.get(activeRoot.sourceCategoryId) ?? []).filter((category) =>
    (counts.get(category.sourceCategoryId) ?? 0) > 0,
  ) : []
  const activeChild = rootChildren.find((category) => category.sourceCategoryId === expandedChildId)
  const leafCategories = activeChild
    ? (children.get(activeChild.sourceCategoryId) ?? []).filter((category) => (counts.get(category.sourceCategoryId) ?? 0) > 0)
    : []

  const matchingCategoryIds = useMemo(() => {
    if (selectedCategoryId === null || selectedCategoryId === -1) return new Set<number>()
    return categoryBranchIds(categories, selectedCategoryId)
  }, [categories, selectedCategoryId])
  const uncategorizedCount = products.filter((product) => product.category === 'Uncategorized').length

  function selectRoot(category: ProductCategory) {
    setExpandedRootId(category.sourceCategoryId)
    setExpandedChildId(null)
    onSelect(category.sourceCategoryId)
  }

  function selectChild(category: ProductCategory) {
    setExpandedChildId(category.sourceCategoryId)
    onSelect(category.sourceCategoryId)
  }

  function itemClass(selected: boolean, depth: number) {
    return `group inline-flex min-h-10 items-center gap-2 border px-3 py-2 text-left text-xs font-bold uppercase tracking-[.07em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#07568b] ${
      selected
        ? 'border-[#07385c] bg-[#07385c] text-[#82dcff]'
        : 'border-[#9bcbe5] bg-white/70 text-[#123d5c] hover:border-[#168fce] hover:bg-[#dff3ff]'
    } ${depth === 0 ? 'min-w-40 justify-between' : 'max-w-full'}`
  }

  function categoryButton(category: ProductCategory, depth: number, select: () => void, expanded: boolean, toggle?: () => void) {
    const count = category.sourceCategoryId === -1
      ? uncategorizedCount
      : counts.get(category.sourceCategoryId) ?? 0
    return (
      <div key={category.sourceCategoryId} className="flex min-w-0 items-stretch gap-1">
        <button
          type="button"
          aria-pressed={selectedCategoryId === category.sourceCategoryId}
          onClick={select}
          className={itemClass(selectedCategoryId === category.sourceCategoryId, depth)}
        >
          <span className="min-w-0 truncate">{category.name}</span>
          <span className={`shrink-0 font-mono text-[10px] ${selectedCategoryId === category.sourceCategoryId ? 'text-[#c7efff]' : 'text-[#426a84]'}`}>{count}</span>
        </button>
        {toggle && (
          <button
            type="button"
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${category.name} subcategories`}
            aria-expanded={expanded}
            onClick={toggle}
            className="grid min-h-10 w-9 shrink-0 place-items-center border border-[#9bcbe5] bg-white/70 text-[#07568b] hover:bg-[#dff3ff] focus-visible:outline-2 focus-visible:outline-[#07568b]"
          >
            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="storefront-category-console border-y border-[#8dbedb] bg-[#e3f4ff]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2 text-[#0c4b72]">
          <Layers3 size={15} aria-hidden="true" />
          <span className="text-[10px] font-extrabold uppercase tracking-[.16em]">Browse by collection</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={selectedCategoryId === null}
            onClick={() => onSelect(null)}
            className={itemClass(selectedCategoryId === null, 0)}
          >
            All products <span className="font-mono text-[10px]">{products.length}</span>
          </button>
          {uncategorizedCount > 0 && categoryButton(
            { sourceCategoryId: -1, name: 'Uncategorized', slug: 'uncategorized', parentSourceCategoryId: 0, sourceProductCount: uncategorizedCount },
            0,
            () => onSelect(-1),
            false,
          )}
        </div>
      </div>
      {isLoading ? (
        <p role="status" className="border-t border-[#9bcbe5] px-4 py-3 text-xs text-[#294f68] sm:px-5">Loading source categories…</p>
      ) : isError ? (
        <p role="status" className="border-t border-[#9bcbe5] px-4 py-3 text-xs text-[#294f68] sm:px-5">Source categories are unavailable; use search or All products.</p>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto border-t border-[#9bcbe5] px-4 py-3 sm:flex-wrap sm:px-5" aria-label="Top-level product categories">
            {roots.map((category) => {
              const hasChildren = (children.get(category.sourceCategoryId) ?? []).some((child) => (counts.get(child.sourceCategoryId) ?? 0) > 0)
              const expanded = expandedRootId === category.sourceCategoryId
              return categoryButton(category, 0, () => selectRoot(category), expanded, hasChildren
                ? () => setExpandedRootId(category.sourceCategoryId)
                : undefined)
            })}
          </div>
          {activeRoot && rootChildren.length > 0 && (
            <div className="border-t border-[#9bcbe5] px-4 py-3 sm:px-5">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[.15em] text-[#426a84]">{activeRoot.name}</p>
              <div className="flex gap-2 overflow-x-auto sm:flex-wrap">
                {rootChildren.map((category) => {
                  const hasChildren = (children.get(category.sourceCategoryId) ?? []).some((child) => (counts.get(child.sourceCategoryId) ?? 0) > 0)
                  return categoryButton(category, 1, () => selectChild(category), expandedChildId === category.sourceCategoryId, hasChildren
                    ? () => setExpandedChildId(category.sourceCategoryId)
                    : undefined)
                })}
              </div>
            </div>
          )}
          {activeChild && leafCategories.length > 0 && (
            <div className="border-t border-[#9bcbe5] px-4 py-3 sm:px-5">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[.15em] text-[#426a84]">{activeRoot?.name} / {activeChild.name}</p>
              <div className="flex gap-2 overflow-x-auto sm:flex-wrap">
                {leafCategories.map((category) => categoryButton(category, 2, () => onSelect(category.sourceCategoryId), false))}
              </div>
            </div>
          )}
        </>
      )}
      {selectedCategoryId !== null && selectedCategoryId !== -1 && (
        <p className="sr-only" aria-live="polite">
          {counts.get(selectedCategoryId) ?? 0} products in {categories.find((category) => category.sourceCategoryId === selectedCategoryId)?.name}.
          {matchingCategoryIds.size} category levels included.
        </p>
      )}
    </div>
  )
}

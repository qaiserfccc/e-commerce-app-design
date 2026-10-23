import type { ReactNode } from 'react'

export const inputClass = 'w-full rounded-lg border border-[#1c1c1a]/15 bg-white px-3 py-2.5 text-sm text-[#1c1c1a] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1c1c1a]'
export const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-full bg-[#1c1c1a] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#353531] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c1c1a] disabled:cursor-wait disabled:opacity-60'
export const secondaryButton = 'rounded-full border border-[#1c1c1a]/15 bg-white px-4 py-2.5 text-sm hover:bg-[#f2f1ed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c1c1a] disabled:opacity-60'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-xs font-medium text-[#55544e]">{label}<div className="mt-1.5">{children}</div></label>
}

export function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'The request could not be completed.'
}

export function Alert({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'info' }) {
  return <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-3 py-2 text-sm ${tone === 'error' ? 'border-[#9b4a36]/30 bg-[#f8eeeb] text-[#753b2d]' : 'border-[#1c1c1a]/15 bg-[#f2f1ed]'}`}>{children}</p>
}

export type AdminCategory = {
  id: string
  parentId: string | null
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  sortOrder: number
  isActive: boolean
  showInMenu: boolean
  seoTitle: string | null
  seoDescription: string | null
  path: string
  depth: number
  productCount: number
}

/** Depth-first flattened tree so selects can show indented options. */
export function flattenCategories(rows: AdminCategory[]) {
  const children = new Map<string, AdminCategory[]>()
  for (const row of rows) children.set(row.parentId ?? 'root', [...(children.get(row.parentId ?? 'root') ?? []), row])
  const out: AdminCategory[] = []
  const seen = new Set<string>()
  const walk = (key: string) => {
    for (const row of children.get(key) ?? []) {
      if (seen.has(row.id)) continue
      seen.add(row.id)
      out.push(row)
      walk(row.id)
    }
  }
  walk('root')
  return out
}

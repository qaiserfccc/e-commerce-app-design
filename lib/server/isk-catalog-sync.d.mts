export type CatalogSyncEntity = 'products' | 'brands' | 'categories' | 'lens-shades' | 'all'

export interface CatalogSyncResult {
  entity: 'products' | 'brands' | 'categories' | 'lens-shades'
  source: number
  created: number
  updated: number
  skipped: number
  [key: string]: unknown
}

export function syncIskCatalog(entity: CatalogSyncEntity): Promise<{ results: CatalogSyncResult[] }>

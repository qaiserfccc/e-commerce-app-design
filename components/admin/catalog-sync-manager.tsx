'use client'

import { useState } from 'react'
import { ArrowRight, Check, Image as ImageIcon, LoaderCircle, Package, RefreshCw, Tags, TriangleAlert } from 'lucide-react'
import { reportError } from '@/lib/ui/notifications'

type Entity = 'all' | 'products' | 'brands' | 'categories' | 'lens-shades'

type SyncResult = {
  entity: Exclude<Entity, 'all'>
  source: number
  created: number
  updated: number
  skipped: number
  imagesUploaded?: number
  imagesReused?: number
  imagesSkipped?: number
  failed?: number
  linked?: number
  logos?: number
  imageFailures?: Array<{ name: string; reason: string }>
  failures?: Array<{ name: string; reason: string }>
  prerequisiteSyncs?: SyncResult[]
  shadeSync?: SyncResult
}

const jobs: Array<{
  id: Exclude<Entity, 'all'>
  title: string
  description: string
  icon: typeof Package
  detail: string
}> = [
  {
    id: 'products',
    title: 'Products and photos',
    description: 'Refresh product names, descriptions, prices, categories and the complete source photo gallery.',
    icon: Package,
    detail: 'Also refreshes linked categories, brands, and lens shades. Local inventory and publication status stay unchanged; new source listings are saved as drafts.',
  },
  {
    id: 'categories',
    title: 'Categories',
    description: 'Refresh the source category tree and save available category photos to Blob.',
    icon: Tags,
    detail: 'Existing local categories are kept; missing source categories are added without deleting anything.',
  },
  {
    id: 'brands',
    title: 'Brands',
    description: 'Refresh brand names from the source product catalog.',
    icon: Tags,
    detail: 'Uploaded brand logos are preserved. The public source does not provide individual brand logo files.',
  },
  {
    id: 'lens-shades',
    title: 'Lens shades',
    description: 'Refresh shade names and save a representative source product photo for each shade to Blob.',
    icon: ImageIcon,
    detail: 'Shade photos are reused from the product gallery when available; shade colors are never guessed.',
  },
]

function resultLines(result: SyncResult) {
  const lines = [`${result.created} new`, `${result.updated} updated`, `${result.skipped} unchanged`]
  if (typeof result.imagesUploaded === 'number') lines.push(`${result.imagesUploaded} images uploaded`)
  if (typeof result.imagesReused === 'number' && result.imagesReused > 0) lines.push(`${result.imagesReused} Blob images reused`)
  if (typeof result.linked === 'number') lines.push(`${result.linked} product links refreshed`)
  return lines.join(' · ')
}

export function CatalogSyncManager({ canEdit }: { canEdit: boolean }) {
  const [running, setRunning] = useState<Entity | null>(null)
  const [results, setResults] = useState<SyncResult[]>([])
  const [error, setError] = useState('')

  async function sync(entity: Entity) {
    setRunning(entity)
    setError('')
    try {
      const response = await fetch('/api/admin/catalog-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity }),
        cache: 'no-store',
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Catalog sync could not be completed.')
      const rows = body.data?.results
      if (!Array.isArray(rows) || !rows.length) throw new Error('The sync finished without a result. You can safely run it again.')
      setResults(rows as SyncResult[])
    } catch (syncError) {
      setError(reportError(syncError, 'Catalog sync failed. You can safely retry; saved records and images are reused.'))
    } finally {
      setRunning(null)
    }
  }

  const warnings = [...new Map(results.flatMap((result) => [
    ...(result.failures ?? []),
    ...(result.imageFailures ?? []),
    ...(result.shadeSync?.imageFailures ?? []),
    ...(result.prerequisiteSyncs ?? []).flatMap((prerequisite) =>
      [...(prerequisite.failures ?? []), ...(prerequisite.imageFailures ?? [])],
    ),
  ]).map((warning) => [`${warning.name}:${warning.reason}`, warning])).values()]

  return (
    <section className="min-w-0 flex-1">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-.04em] text-[#15384d]">Catalog sync</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#526b7b]">
            Refresh catalog data from ISK Lenses. Syncs are safe to repeat: source records are matched by stable IDs, existing files are reused, and local inventory is left alone.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            disabled={Boolean(running)}
            onClick={() => void sync('all')}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#006f9b] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#005c80] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087ba5] disabled:cursor-wait disabled:opacity-60"
          >
            {running === 'all' ? <LoaderCircle size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {running === 'all' ? 'Syncing catalog…' : 'Sync everything'}
          </button>
        )}
      </div>

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[#b8d4e0] bg-[#e8f6fb] p-4 text-sm leading-6 text-[#15384d]">
        <Check size={18} className="mt-0.5 shrink-0 text-[#006f9b]" aria-hidden="true" />
        <p>Syncs only add or refresh source records. They do not delete products, overwrite stock counts, change publication status, or remove uploaded logos.</p>
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl border border-[#b4233e]/25 bg-[#fff1f2] px-4 py-3 text-sm text-[#8f1830]">{error}</p>}

      <div className="divide-y divide-[#cfe2eb] rounded-2xl border border-[#cfe2eb] bg-white px-5">
        {jobs.map(({ id, title, description, detail, icon: Icon }) => {
          const latest = results.find((result) => result.entity === id)
          const isRunning = running === id || running === 'all'
          return (
            <article key={id} className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="flex gap-3">
                <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-[#e8f6fb] text-[#006f9b]">
                  <Icon size={19} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-semibold text-[#15384d]">{title}</h2>
                  <p className="mt-1 text-sm leading-5 text-[#526b7b]">{description}</p>
                  <p className="mt-1 text-xs leading-5 text-[#526b7b]">{detail}</p>
                  {latest && (
                    <p role="status" className="mt-2 text-xs font-medium text-[#006f9b]">
                      {resultLines(latest)} · {latest.source} source records
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                disabled={!canEdit || Boolean(running)}
                onClick={() => void sync(id)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#b8d4e0] bg-white px-4 py-2 text-sm font-semibold text-[#15384d] transition-colors hover:bg-[#f7fcff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087ba5] disabled:cursor-not-allowed disabled:opacity-55 sm:justify-self-end"
              >
                {isRunning ? <LoaderCircle size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                {isRunning ? 'Syncing…' : `Sync ${id === 'lens-shades' ? 'shades' : id}`}
                {!isRunning && <ArrowRight size={14} aria-hidden="true" />}
              </button>
            </article>
          )
        })}
      </div>

      {running && (
        <p role="status" className="mt-4 text-sm text-[#526b7b]">
          Syncing source data and Blob images. Product galleries can take a few minutes; if a request times out, run it again to continue from saved records.
        </p>
      )}
      {!canEdit && <p className="mt-4 text-sm text-[#526b7b]">Your account can view sync status but needs admin access to start a sync.</p>}
      {warnings.length > 0 && (
        <div className="mt-5 rounded-xl border border-[#b66b24]/30 bg-[#fff8ec] p-4 text-sm text-[#6f4514]">
          <p className="flex items-center gap-2 font-semibold"><TriangleAlert size={16} /> {warnings.length} item{warnings.length === 1 ? '' : 's'} could not be synced</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {warnings.slice(0, 8).map((warning, index) => <li key={`${warning.name}-${index}`}>{warning.name}: {warning.reason}</li>)}
          </ul>
          {warnings.length > 8 && <p className="mt-2 text-xs">Showing the first 8 issues. Retry sync to process failed items.</p>}
        </div>
      )}
    </section>
  )
}

'use client'

import { useState, type FormEvent } from 'react'
import useSWR from 'swr'
import { LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  deleteBrand, deleteLensShade, getAdminBrands, getAdminLensShades, getRecentErrorLogs, saveBrand, saveLensShade,
} from '@/app/actions/catalog-taxonomy'
import { Alert, Field, inputClass, primaryButton, secondaryButton } from '@/components/admin/admin-ui'
import { reportError } from '@/lib/ui/notifications'

type Brand = Awaited<ReturnType<typeof getAdminBrands>>[number]
type LensShade = Awaited<ReturnType<typeof getAdminLensShades>>[number]

function BrandForm({ brand, onDone, onCancel }: { brand?: Brand; onDone: () => void; onCancel: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      await saveBrand({ id: brand?.id, name: form.get('name'), isActive: form.get('isActive') === 'on' })
      onDone()
    } catch (saveError) {
      setError(reportError(saveError, 'Brand could not be saved.'))
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="mb-5 grid gap-4 rounded-2xl border border-[#1c1c1a]/10 bg-white p-5 sm:grid-cols-[1fr_auto_auto] sm:items-end">
      <Field label="Brand name" required><input name="name" required maxLength={100} defaultValue={brand?.name ?? ''} className={inputClass} /></Field>
      <label className="flex items-center gap-2 pb-2 text-sm"><input name="isActive" type="checkbox" defaultChecked={brand?.isActive ?? true} /> Active</label>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={primaryButton}>{busy && <LoaderCircle size={15} className="animate-spin" />}{brand ? 'Save brand' : 'Create brand'}</button>
        <button type="button" onClick={onCancel} className={secondaryButton}>Cancel</button>
      </div>
      {error && <div className="sm:col-span-3"><Alert>{error}</Alert></div>}
    </form>
  )
}

function LensShadeForm({ shade, onDone, onCancel }: { shade?: LensShade; onDone: () => void; onCancel: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      await saveLensShade({ id: shade?.id, name: form.get('name'), hex: form.get('hex'), isActive: form.get('isActive') === 'on' })
      onDone()
    } catch (saveError) {
      setError(reportError(saveError, 'Lens shade could not be saved.'))
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="mb-5 grid gap-4 rounded-2xl border border-[#1c1c1a]/10 bg-white p-5 sm:grid-cols-[1fr_140px_auto_auto] sm:items-end">
      <Field label="Shade name" required><input name="name" required maxLength={80} defaultValue={shade?.name ?? ''} className={inputClass} /></Field>
      <Field label="Shade color" required><input name="hex" type="color" required defaultValue={shade?.hex ?? '#4b89c8'} className={`${inputClass} h-10 p-1`} /></Field>
      <label className="flex items-center gap-2 pb-2 text-sm"><input name="isActive" type="checkbox" defaultChecked={shade?.isActive ?? true} /> Active</label>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={primaryButton}>{busy && <LoaderCircle size={15} className="animate-spin" />}{shade ? 'Save shade' : 'Create shade'}</button>
        <button type="button" onClick={onCancel} className={secondaryButton}>Cancel</button>
      </div>
      {error && <div className="sm:col-span-4"><Alert>{error}</Alert></div>}
    </form>
  )
}

export function BrandManager({ canEdit }: { canEdit: boolean }) {
  const { data, error, isLoading, mutate } = useSWR('admin-brands', () => getAdminBrands())
  const [editing, setEditing] = useState<Brand | 'new' | null>(null)
  const [message, setMessage] = useState('')
  async function remove(brand: Brand) {
    if (!window.confirm(`Delete brand ${brand.name}? Products using it will have their brand cleared.`)) return
    try { await deleteBrand(brand.id); await mutate() }
    catch (removeError) { setMessage(reportError(removeError, 'Brand could not be deleted.')) }
  }
  return (
    <section className="min-w-0 flex-1">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-semibold tracking-[-.04em]">Brands</h1><p className="mt-2 text-sm leading-6 text-[#68675f]">Maintain a reusable catalog of product brands.</p></div>
        {canEdit && <button type="button" onClick={() => setEditing('new')} className={primaryButton}><Plus size={16} /> Add brand</button>}
      </div>
      {(message || error) && <div className="mb-4"><Alert>{message || (error instanceof Error ? error.message : 'Brands could not be loaded.')}</Alert></div>}
      {editing && <BrandForm brand={editing === 'new' ? undefined : editing} onCancel={() => setEditing(null)} onDone={() => { setEditing(null); void mutate() }} />}
      {isLoading ? <p className="text-sm text-[#68675f]">Loading brands…</p> : !data?.length ? <p className="rounded-2xl border border-dashed border-[#1c1c1a]/20 bg-white/60 px-5 py-10 text-center text-sm text-[#68675f]">No brands yet. Add one to make it available in product forms.</p> : (
        <ul className="space-y-2">{data.map((brand) => <li key={brand.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#1c1c1a]/10 bg-white px-4 py-3">
          <p className="text-sm font-medium">{brand.name}{!brand.isActive && <span className="ml-2 text-xs text-[#68675f]">Inactive</span>}</p>
          {canEdit && <div className="flex">
            <button type="button" aria-label={`Edit ${brand.name}`} onClick={() => setEditing(brand)} className="grid size-9 place-items-center rounded-full hover:bg-[#f2f1ed]"><Pencil size={15} /></button>
            <button type="button" aria-label={`Delete ${brand.name}`} onClick={() => void remove(brand)} className="grid size-9 place-items-center rounded-full text-[#753b2d] hover:bg-[#f8eeeb]"><Trash2 size={15} /></button>
          </div>}
        </li>)}</ul>
      )}
    </section>
  )
}

export function LensShadeManager({ canEdit }: { canEdit: boolean }) {
  const { data, error, isLoading, mutate } = useSWR('admin-lens-shades', () => getAdminLensShades())
  const [editing, setEditing] = useState<LensShade | 'new' | null>(null)
  const [message, setMessage] = useState('')
  async function remove(shade: LensShade) {
    if (!window.confirm(`Delete lens shade ${shade.name}? Products using it will have their shade cleared.`)) return
    try { await deleteLensShade(shade.id); await mutate() }
    catch (removeError) { setMessage(reportError(removeError, 'Lens shade could not be deleted.')) }
  }
  return (
    <section className="min-w-0 flex-1">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-semibold tracking-[-.04em]">Lens shades</h1><p className="mt-2 text-sm leading-6 text-[#68675f]">Manage color shades that can be attached to lens products.</p></div>
        {canEdit && <button type="button" onClick={() => setEditing('new')} className={primaryButton}><Plus size={16} /> Add lens shade</button>}
      </div>
      {(message || error) && <div className="mb-4"><Alert>{message || (error instanceof Error ? error.message : 'Lens shades could not be loaded.')}</Alert></div>}
      {editing && <LensShadeForm shade={editing === 'new' ? undefined : editing} onCancel={() => setEditing(null)} onDone={() => { setEditing(null); void mutate() }} />}
      {isLoading ? <p className="text-sm text-[#68675f]">Loading lens shades…</p> : !data?.length ? <p className="rounded-2xl border border-dashed border-[#1c1c1a]/20 bg-white/60 px-5 py-10 text-center text-sm text-[#68675f]">No shades yet. Add a shade to make it available in product forms.</p> : (
        <ul className="space-y-2">{data.map((shade) => <li key={shade.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#1c1c1a]/10 bg-white px-4 py-3">
          <div className="flex items-center gap-3"><span className="size-8 rounded-full border border-black/15" style={{ backgroundColor: shade.hex }} /><p className="text-sm font-medium">{shade.name}<span className="ml-2 text-xs text-[#68675f]">{shade.hex}</span>{!shade.isActive && <span className="ml-2 text-xs text-[#68675f]">Inactive</span>}</p></div>
          {canEdit && <div className="flex">
            <button type="button" aria-label={`Edit ${shade.name}`} onClick={() => setEditing(shade)} className="grid size-9 place-items-center rounded-full hover:bg-[#f2f1ed]"><Pencil size={15} /></button>
            <button type="button" aria-label={`Delete ${shade.name}`} onClick={() => void remove(shade)} className="grid size-9 place-items-center rounded-full text-[#753b2d] hover:bg-[#f8eeeb]"><Trash2 size={15} /></button>
          </div>}
        </li>)}</ul>
      )}
    </section>
  )
}

export function ErrorLogManager() {
  const { data, error, isLoading, mutate } = useSWR('admin-error-logs', () => getRecentErrorLogs(), { refreshInterval: 30000 })
  return (
    <section className="min-w-0 flex-1">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-semibold tracking-[-.04em]">Error logs</h1><p className="mt-2 text-sm leading-6 text-[#68675f]">Recent application errors. Entries are pruned after 24 hours; up to 200 are shown here.</p></div>
        <button type="button" onClick={() => void mutate()} className={secondaryButton}>Refresh</button>
      </div>
      {error && <div className="mb-4"><Alert>{error instanceof Error ? error.message : 'Error logs could not be loaded.'}</Alert></div>}
      {isLoading ? <p className="text-sm text-[#68675f]">Loading error logs…</p> : !data?.length ? <p className="rounded-2xl border border-dashed border-[#1c1c1a]/20 bg-white/60 px-5 py-10 text-center text-sm text-[#68675f]">No errors recorded in the last 24 hours.</p> : (
        <ul className="space-y-3">{data.map((entry) => <li key={entry.id} className="rounded-xl border border-[#9b4a36]/20 bg-white p-4">
          <div className="flex flex-wrap justify-between gap-2"><p className="font-medium text-[#753b2d]">{entry.errorName}</p><time className="text-xs text-[#68675f]" dateTime={entry.createdAt.toISOString()}>{entry.createdAt.toLocaleString()}</time></div>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm">{entry.message}</p>
          <p className="mt-2 text-xs text-[#68675f]">Source: {entry.source}</p>
          {entry.stack && <details className="mt-2"><summary className="cursor-pointer text-xs">Stack trace</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[#f2f1ed] p-3 text-xs">{entry.stack}</pre></details>}
        </li>)}</ul>
      )}
    </section>
  )
}

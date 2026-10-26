'use client'

import { useState, type FormEvent } from 'react'
import useSWR from 'swr'
import { ArrowDown, ArrowUp, LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-react'
import { createCategory, deleteCategory, getAdminCategories, moveCategory, updateCategory } from '@/app/actions/catalog-admin'
import { Alert, errorText, Field, flattenCategories, inputClass, primaryButton, secondaryButton, type AdminCategory } from '@/components/admin/admin-ui'
import { reportError } from '@/lib/ui/notifications'

function CategoryForm({ category, defaultParentId, rows, onDone, onCancel }: { category?: AdminCategory; defaultParentId?: string; rows: AdminCategory[]; onDone: () => void; onCancel: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [imageUrl, setImageUrl] = useState(category?.imageUrl ?? '')
  const blocked = new Set<string>()
  if (category) {
    blocked.add(category.id)
    let grew = true
    while (grew) {
      grew = false
      for (const row of rows) if (row.parentId && blocked.has(row.parentId) && !blocked.has(row.id)) { blocked.add(row.id); grew = true }
    }
  }

  async function upload(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const form = new FormData()
      form.set('file', file)
      const response = await fetch('/api/admin/content/upload', { method: 'POST', body: form })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Upload failed.')
      setImageUrl(payload.data.url)
    } catch (uploadError) {
      setError(reportError(uploadError, 'Category image could not be uploaded.'))
    } finally {
      setBusy(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const input = {
      name: form.get('name'),
      slug: form.get('slug'),
      parentId: form.get('parentId') || null,
      description: form.get('description'),
      imageUrl,
      sortOrder: Number(form.get('sortOrder') || 0),
      isActive: form.get('isActive') === 'on',
      showInMenu: form.get('showInMenu') === 'on',
      seoTitle: form.get('seoTitle'),
      seoDescription: form.get('seoDescription'),
    }
    setBusy(true)
    setError('')
    try {
      if (category) await updateCategory(category.id, input)
      else await createCategory(input)
      onDone()
    } catch (saveError) {
      setError(reportError(saveError, 'The category could not be saved.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form key={category?.id ?? 'new'} onSubmit={submit} className="mb-5 rounded-2xl border border-[#1c1c1a]/10 bg-white p-5">
      <h2 className="mb-4 font-medium">{category ? `Edit ${category.name}` : 'Add a category'}</h2>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name"><input name="name" required maxLength={120} defaultValue={category?.name} className={inputClass} /></Field>
        <Field label="Slug (blank = from name)"><input name="slug" maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={category?.slug} className={inputClass} /></Field>
        <Field label="Parent category">
          <select name="parentId" defaultValue={category?.parentId ?? defaultParentId ?? ''} className={inputClass}>
            <option value="">— Top level —</option>
            {flattenCategories(rows).filter((row) => !blocked.has(row.id)).map((row) => <option key={row.id} value={row.id}>{'\u2003'.repeat(row.depth)}{row.name}</option>)}
          </select>
        </Field>
        <Field label="Sort order"><input name="sortOrder" type="number" step="1" defaultValue={category?.sortOrder ?? 0} className={inputClass} /></Field>
        <div className="sm:col-span-2"><Field label="Description (shown on the category page)"><textarea name="description" rows={2} maxLength={2000} defaultValue={category?.description ?? ''} className={inputClass} /></Field></div>
        <Field label="Image URL"><input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://…" className={inputClass} /></Field>
        <Field label="Upload image (max 4 MB)"><input type="file" disabled={busy} accept="image/avif,image/jpeg,image/png,image/webp" onChange={(event) => void upload(event.target.files?.[0])} className="block w-full text-xs" /></Field>
        <Field label="SEO title"><input name="seoTitle" maxLength={160} defaultValue={category?.seoTitle ?? ''} className={inputClass} /></Field>
        <Field label="SEO description"><input name="seoDescription" maxLength={320} defaultValue={category?.seoDescription ?? ''} className={inputClass} /></Field>
        <label className="flex items-center gap-2 text-sm"><input name="isActive" type="checkbox" defaultChecked={category?.isActive ?? true} /> Active (visible on the storefront)</label>
        <label className="flex items-center gap-2 text-sm"><input name="showInMenu" type="checkbox" defaultChecked={category?.showInMenu ?? true} /> Show in navigation menu</label>
      </div>
      <div className="mt-5 flex gap-2">
        <button type="submit" disabled={busy} className={primaryButton}>{busy && <LoaderCircle size={15} className="animate-spin" />}{category ? 'Save category' : 'Create category'}</button>
        <button type="button" onClick={onCancel} className={secondaryButton}>Cancel</button>
      </div>
    </form>
  )
}

export function CategoryManager({ canEdit }: { canEdit: boolean }) {
  const { data, error, isLoading, mutate } = useSWR('admin-categories', () => getAdminCategories())
  const [editing, setEditing] = useState<AdminCategory | 'new' | { parentId: string } | null>(null)
  const [message, setMessage] = useState('')
  const rows = (data ?? []) as AdminCategory[]
  const flat = flattenCategories(rows)

  async function run(action: () => Promise<unknown>) {
    setMessage('')
    try {
      await action()
      await mutate()
    } catch (actionError) {
      setMessage(reportError(actionError, 'The category action could not be completed.'))
    }
  }

  return (
    <section className="min-w-0 flex-1">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-.04em]">Categories</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#68675f]">Nest categories to any depth. Products must belong to one category and also appear in every parent category above it.</p>
        </div>
        {canEdit && <button type="button" onClick={() => setEditing('new')} className={primaryButton}><Plus size={16} /> Add category</button>}
      </div>
      {(message || error) && <div className="mb-4"><Alert>{message || errorText(error)}</Alert></div>}
      {editing && <CategoryForm category={editing !== 'new' && !('parentId' in editing && !('id' in editing)) ? (editing as AdminCategory) : undefined} defaultParentId={editing !== 'new' && !('id' in editing) ? editing.parentId : undefined} rows={rows} onCancel={() => setEditing(null)} onDone={() => { setEditing(null); void mutate() }} />}
      {isLoading ? <p className="text-sm text-[#68675f]">Loading categories…</p> : flat.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#1c1c1a]/20 bg-white/60 px-5 py-10 text-center text-sm text-[#68675f]">No categories yet. Add one to start building the catalog.</p>
      ) : (
        <ul className="space-y-2">
          {flat.map((row) => (
            <li key={row.id} style={{ marginLeft: row.depth * 24 }} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#1c1c1a]/10 bg-white px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{row.name} {!row.isActive && <span className="ml-1 rounded bg-[#f2f1ed] px-1.5 py-0.5 text-xs uppercase">Hidden</span>}{!row.showInMenu && <span className="ml-1 rounded bg-[#f2f1ed] px-1.5 py-0.5 text-xs uppercase">Not in menu</span>}</p>
                <p className="text-xs text-[#68675f]">/product-category/{row.path} · {row.productCount} direct product{row.productCount === 1 ? '' : 's'}</p>
              </div>
              {canEdit && (
                <div className="flex items-center gap-1">
                  <button type="button" aria-label={`Move ${row.name} up`} onClick={() => void run(() => moveCategory(row.id, 'up'))} className="grid size-9 place-items-center rounded-full hover:bg-[#f2f1ed]"><ArrowUp size={15} /></button>
                  <button type="button" aria-label={`Move ${row.name} down`} onClick={() => void run(() => moveCategory(row.id, 'down'))} className="grid size-9 place-items-center rounded-full hover:bg-[#f2f1ed]"><ArrowDown size={15} /></button>
                  <button type="button" aria-label={`Add sub-category under ${row.name}`} onClick={() => setEditing({ parentId: row.id })} className="grid size-9 place-items-center rounded-full hover:bg-[#f2f1ed]"><Plus size={15} /></button>
                  <button type="button" aria-label={`Edit ${row.name}`} onClick={() => setEditing(row)} className="grid size-9 place-items-center rounded-full hover:bg-[#f2f1ed]"><Pencil size={15} /></button>
                  <button type="button" aria-label={`Delete ${row.name}`} onClick={() => { if (window.confirm(`Delete category ${row.name}?`)) void run(() => deleteCategory(row.id)) }} className="grid size-9 place-items-center rounded-full text-[#753b2d] hover:bg-[#f8eeeb]"><Trash2 size={15} /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

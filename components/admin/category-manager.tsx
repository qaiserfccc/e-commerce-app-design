'use client'

import { useState, type FormEvent } from 'react'
import useSWR from 'swr'
import { ArrowDown, ArrowUp, LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-react'
import { DataTable, type DataTableBulkAction, type DataTableColumn } from '@/components/admin/data-table'
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
        <Field label="Name" required><input name="name" required maxLength={120} defaultValue={category?.name} className={inputClass} /></Field>
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
          <p className="mt-1 max-w-2xl text-sm text-[#68675f]">Nest categories to any depth. Products can be assigned to several categories and appear in each category’s parent hierarchy.</p>
        </div>
        {canEdit && <button type="button" onClick={() => setEditing('new')} className={primaryButton}><Plus size={16} /> Add category</button>}
      </div>
      {(message || error) && <div className="mb-4"><Alert>{message || errorText(error)}</Alert></div>}
      {editing && <CategoryForm category={editing !== 'new' && !('parentId' in editing && !('id' in editing)) ? (editing as AdminCategory) : undefined} defaultParentId={editing !== 'new' && !('id' in editing) ? editing.parentId : undefined} rows={rows} onCancel={() => setEditing(null)} onDone={() => { setEditing(null); void mutate() }} />}
      {isLoading ? <p className="text-sm text-[#68675f]">Loading categories…</p> : flat.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#1c1c1a]/20 bg-white/60 px-5 py-10 text-center text-sm text-[#68675f]">No categories yet. Add one to start building the catalog.</p>
      ) : (
        <DataTable
          rows={flat}
          getRowId={(category) => category.id}
          getSearchValue={(category) => `${category.name} ${category.path}`}
          itemLabel="categories"
          emptyMessage="No categories are available."
          filters={[
            { id: 'visibility', label: 'Visibility', options: [{ label: 'Active', value: 'active' }, { label: 'Hidden', value: 'hidden' }], value: (category) => category.isActive ? 'active' : 'hidden' },
            { id: 'menu', label: 'Navigation', options: [{ label: 'In menu', value: 'menu' }, { label: 'Not in menu', value: 'not-menu' }], value: (category) => category.showInMenu ? 'menu' : 'not-menu' },
          ]}
          columns={[
            { id: 'category', header: 'Category', sortValue: (category) => category.name, searchValue: (category) => `${category.name} ${category.path}`, className: 'min-w-[280px]', cell: (category) => <div style={{ paddingInlineStart: category.depth * 20 }}>
              <p className="font-medium">{category.name} {!category.isActive && <span className="ml-1 rounded-full bg-[#f3f5f6] px-2 py-0.5 text-xs text-[#526b7b]">Hidden</span>}{!category.showInMenu && <span className="ml-1 rounded-full bg-[#f3f5f6] px-2 py-0.5 text-xs text-[#526b7b]">Not in menu</span>}</p>
              <p className="mt-1 text-xs text-[#526b7b]">/product-category/{category.path}</p>
            </div> },
            { id: 'products', header: 'Products', sortValue: (category) => category.productCount, cell: (category) => `${category.productCount} direct` },
            { id: 'actions', header: 'Actions', className: 'w-48 text-right', cell: (category) => canEdit ? <div className="flex justify-end gap-0.5">
              <button type="button" aria-label={`Move ${category.name} up`} onClick={() => void run(() => moveCategory(category.id, 'up'))} className="grid size-9 place-items-center rounded-full hover:bg-[#e8f6fb]"><ArrowUp size={15} /></button>
              <button type="button" aria-label={`Move ${category.name} down`} onClick={() => void run(() => moveCategory(category.id, 'down'))} className="grid size-9 place-items-center rounded-full hover:bg-[#e8f6fb]"><ArrowDown size={15} /></button>
              <button type="button" aria-label={`Add sub-category under ${category.name}`} onClick={() => setEditing({ parentId: category.id })} className="grid size-9 place-items-center rounded-full hover:bg-[#e8f6fb]"><Plus size={15} /></button>
              <button type="button" aria-label={`Edit ${category.name}`} onClick={() => setEditing(category)} className="grid size-9 place-items-center rounded-full hover:bg-[#e8f6fb]"><Pencil size={15} /></button>
              <button type="button" aria-label={`Delete ${category.name}`} onClick={() => { if (window.confirm(`Delete category ${category.name}?`)) void run(() => deleteCategory(category.id)) }} className="grid size-9 place-items-center rounded-full text-[#753b2d] hover:bg-[#f8eeeb]"><Trash2 size={15} /></button>
            </div> : null },
          ] as DataTableColumn<AdminCategory>[]}
          exportRow={(category) => ({ Name: category.name, Path: category.path, Active: category.isActive, 'Shown in menu': category.showInMenu, 'Direct products': category.productCount })}
          bulkActions={canEdit ? [{
            label: 'Delete selected',
            disabled: (selected) => selected.some((category) => category.productCount > 0 || flat.some((other) => other.parentId === category.id && !selected.some((picked) => picked.id === other.id))),
            confirm: (selected) => `Delete ${selected.length} selected categor${selected.length === 1 ? 'y' : 'ies'}? Categories with products or unselected sub-categories cannot be removed.`,
            run: async (selected) => {
              const ordered = [...selected].sort((left, right) => right.depth - left.depth)
              try { for (const category of ordered) await deleteCategory(category.id) }
              finally { await mutate() }
            },
          } satisfies DataTableBulkAction<AdminCategory>] : []}
        />
      )}
    </section>
  )
}

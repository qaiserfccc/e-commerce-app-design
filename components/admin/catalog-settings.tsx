'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { ArrowDown, ArrowUp, Check, LoaderCircle, Plus, Trash2, X } from 'lucide-react'
import { createAdminReview, deleteReview, getAdminProductPageSettings, getAdminReviews, saveProductPageSettings, setReviewApproval } from '@/app/actions/catalog-admin'
import { Alert, errorText, Field, inputClass, primaryButton, secondaryButton } from '@/components/admin/admin-ui'
import { SECTION_SOURCES, SECTION_SOURCE_LABELS, type ProductPageSettings } from '@/lib/catalog-types'
import { useAdminProducts } from '@/lib/hooks/use-admin-data'
import { reportError } from '@/lib/ui/notifications'

function SettingsEditor({ initial, canEdit }: { initial: ProductPageSettings; canEdit: boolean }) {
  const [settings, setSettings] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'error' | 'info'; text: string } | null>(null)
  const update = (index: number, patch: Partial<ProductPageSettings['sections'][number]>) => setSettings({ ...settings, sections: settings.sections.map((row, i) => (i === index ? { ...row, ...patch } : row)) })
  const move = (index: number, delta: number) => {
    const next = [...settings.sections]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setSettings({ ...settings, sections: next })
  }

  async function save() {
    setBusy(true)
    setMessage(null)
    try {
      await saveProductPageSettings(settings)
      setMessage({ tone: 'info', text: 'Saved. Product pages update within a few minutes.' })
    } catch (error) {
      setMessage({ tone: 'error', text: reportError(error, 'Product page settings could not be saved.') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-[#1c1c1a]/10 bg-white p-5">
      <h2 className="font-medium">Sections below the product</h2>
      <p className="mt-1 text-xs text-[#68675f]">Choose what appears at the bottom of every product page, in order. “Hand-picked” uses the related products set on each product.</p>
      <ul className="mt-4 space-y-3">
        {settings.sections.map((section, index) => (
          <li key={section.id} className="grid gap-3 rounded-xl border border-[#1c1c1a]/10 p-3 sm:grid-cols-[1fr_1.3fr_80px_auto]">
            <Field label="Title"><input value={section.title} maxLength={80} disabled={!canEdit} onChange={(event) => update(index, { title: event.target.value })} className={inputClass} /></Field>
            <Field label="Products from">
              <select value={section.source} disabled={!canEdit} onChange={(event) => update(index, { source: event.target.value as typeof section.source })} className={inputClass}>
                {SECTION_SOURCES.map((source) => <option key={source} value={source}>{SECTION_SOURCE_LABELS[source]}</option>)}
              </select>
            </Field>
            <Field label="Count"><input type="number" min={1} max={12} value={section.limit} disabled={!canEdit} onChange={(event) => update(index, { limit: Number(event.target.value) })} className={inputClass} /></Field>
            <div className="flex items-end gap-1 pb-1">
              <label className="mr-2 flex items-center gap-1 text-xs"><input type="checkbox" checked={section.enabled} disabled={!canEdit} onChange={(event) => update(index, { enabled: event.target.checked })} /> On</label>
              {canEdit && <>
                <button type="button" aria-label="Move up" onClick={() => move(index, -1)} className="grid size-8 place-items-center rounded-full hover:bg-[#f2f1ed]"><ArrowUp size={14} /></button>
                <button type="button" aria-label="Move down" onClick={() => move(index, 1)} className="grid size-8 place-items-center rounded-full hover:bg-[#f2f1ed]"><ArrowDown size={14} /></button>
                <button type="button" aria-label="Remove section" onClick={() => setSettings({ ...settings, sections: settings.sections.filter((_, i) => i !== index) })} className="grid size-8 place-items-center rounded-full text-[#753b2d] hover:bg-[#f8eeeb]"><Trash2 size={14} /></button>
              </>}
            </div>
          </li>
        ))}
      </ul>
      {canEdit && settings.sections.length < 12 && (
        <button type="button" onClick={() => setSettings({ ...settings, sections: [...settings.sections, { id: `section-${Date.now().toString(36)}`, title: 'New section', source: 'newest', limit: 4, enabled: true }] })} className={`${secondaryButton} mt-3`}><Plus size={14} className="mr-1 inline" />Add section</button>
      )}

      <h2 className="mt-8 font-medium">Customer reviews</h2>
      <div className="mt-3 space-y-2 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" disabled={!canEdit} checked={settings.reviews.enabled} onChange={(event) => setSettings({ ...settings, reviews: { ...settings.reviews, enabled: event.target.checked } })} /> Show reviews on product pages</label>
        <label className="flex items-center gap-2"><input type="checkbox" disabled={!canEdit} checked={settings.reviews.allowSubmission} onChange={(event) => setSettings({ ...settings, reviews: { ...settings.reviews, allowSubmission: event.target.checked } })} /> Let customers submit reviews</label>
        <label className="flex items-center gap-2"><input type="checkbox" disabled={!canEdit} checked={settings.reviews.autoApprove} onChange={(event) => setSettings({ ...settings, reviews: { ...settings.reviews, autoApprove: event.target.checked } })} /> Publish new reviews without moderation</label>
      </div>
      {message && <div className="mt-4"><Alert tone={message.tone}>{message.text}</Alert></div>}
      {canEdit && <button type="button" disabled={busy} onClick={() => void save()} className={`${primaryButton} mt-5`}>{busy && <LoaderCircle size={15} className="animate-spin" />}Save settings</button>}
    </div>
  )
}

function ReviewModeration({ canEdit }: { canEdit: boolean }) {
  const { data, mutate, error } = useSWR('admin-reviews', () => getAdminReviews())
  const { products } = useAdminProducts()
  const [message, setMessage] = useState('')
  const [adding, setAdding] = useState(false)

  async function run(action: () => Promise<unknown>) {
    setMessage('')
    try {
      await action()
      await mutate()
    } catch (actionError) {
      setMessage(reportError(actionError, 'The review action could not be completed.'))
    }
  }

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await run(async () => {
      await createAdminReview({ productId: form.get('productId'), author: form.get('author'), rating: Number(form.get('rating')), title: form.get('title'), body: form.get('body'), isApproved: true })
      setAdding(false)
    })
  }

  return (
    <div className="mt-6 rounded-2xl border border-[#1c1c1a]/10 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">Review moderation</h2>
        {canEdit && <button type="button" onClick={() => setAdding((value) => !value)} className={secondaryButton}>{adding ? 'Close' : 'Add review'}</button>}
      </div>
      {(message || error) && <div className="mt-3"><Alert>{message || errorText(error)}</Alert></div>}
      {adding && (
        <form onSubmit={(event) => void add(event)} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Product"><select name="productId" required className={inputClass}>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
          <Field label="Author"><input name="author" required maxLength={80} className={inputClass} /></Field>
          <Field label="Rating (1–5)"><input name="rating" type="number" min={1} max={5} defaultValue={5} required className={inputClass} /></Field>
          <Field label="Title"><input name="title" maxLength={120} className={inputClass} /></Field>
          <div className="sm:col-span-2"><Field label="Review"><textarea name="body" required rows={3} maxLength={2000} className={inputClass} /></Field></div>
          <button className={`${primaryButton} justify-self-start`}>Publish review</button>
        </form>
      )}
      <ul className="mt-4 divide-y divide-[#1c1c1a]/10">
        {(data ?? []).length === 0 && <li className="py-4 text-sm text-[#68675f]">No reviews yet.</li>}
        {(data ?? []).map((review) => (
          <li key={review.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
            <div className="min-w-0 max-w-2xl text-sm">
              <p className="font-medium">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)} <span className="text-xs font-normal text-[#68675f]">{review.author} on {review.productName}</span> {!review.isApproved && <span className="ml-1 rounded bg-[#fff1cc] px-1.5 py-0.5 text-xs uppercase">Pending</span>}</p>
              {review.title && <p className="font-medium">{review.title}</p>}
              <p className="text-[#41403a]">{review.body}</p>
            </div>
            {canEdit && <div className="flex gap-1">
              <button type="button" aria-label={review.isApproved ? 'Unpublish review' : 'Approve review'} onClick={() => void run(() => setReviewApproval(review.id, !review.isApproved))} className="grid size-9 place-items-center rounded-full hover:bg-[#f2f1ed]">{review.isApproved ? <X size={15} /> : <Check size={15} />}</button>
              <button type="button" aria-label="Delete review" onClick={() => { if (window.confirm('Delete this review?')) void run(() => deleteReview(review.id)) }} className="grid size-9 place-items-center rounded-full text-[#753b2d] hover:bg-[#f8eeeb]"><Trash2 size={15} /></button>
            </div>}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CatalogSettings({ canEdit }: { canEdit: boolean }) {
  const { data, error, isLoading } = useSWR('admin-product-page', () => getAdminProductPageSettings(), { revalidateOnFocus: false })
  return (
    <section className="min-w-0 flex-1">
      <h1 className="text-2xl font-semibold tracking-[-.04em]">Reviews &amp; product page</h1>
      <p className="mb-6 mt-1 text-sm text-[#68675f]">Configure related, “also bought”, best-seller and recent-order sections, and moderate customer reviews.</p>
      {error && <Alert>{errorText(error)}</Alert>}
      {isLoading || !data ? <p className="text-sm text-[#68675f]">Loading…</p> : <SettingsEditor initial={data} canEdit={canEdit} />}
      <ReviewModeration canEdit={canEdit} />
    </section>
  )
}

'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { LoaderCircle, Trash2 } from 'lucide-react'
import { deleteBanner, deleteReview, getContentAdmin, saveBanner, saveReview, saveSetting } from '@/app/actions/content'
import { BANNER_PLACEMENTS, SETTING_KEYS, type SettingKey } from '@/lib/content-types'
import { reportError } from '@/lib/ui/notifications'

type Content = Awaited<ReturnType<typeof getContentAdmin>>
type BannerRow = Content['banners'][number]

const placementLabels: Record<string, string> = {
  hero: 'Hero slider', promo: 'Promo tiles', brand: 'Brand logos', category: 'Category tiles',
  service: 'Service images', new_arrival: 'New arrivals banner', feature: 'Store promises', why_choose: 'Why choose us',
}
const inputClass = 'w-full rounded-lg border border-[#d8d6cc] bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-[#1c1c1a]'
function BannerEditor({ banner, canEdit, onChanged, onError }: { banner?: BannerRow; canEdit: boolean; onChanged: () => Promise<void>; onError: (message: string) => void }) {
  const [placement, setPlacement] = useState(banner?.placement ?? 'hero')
  const [title, setTitle] = useState(banner?.title ?? '')
  const [body, setBody] = useState(banner?.body ?? '')
  const [href, setHref] = useState(banner?.href ?? '')
  const [imageUrl, setImageUrl] = useState(banner?.imageUrl ?? '')
  const [blobPathname, setBlobPathname] = useState(banner?.blobPathname ?? '')
  const [sortOrder, setSortOrder] = useState(String(banner?.sortOrder ?? 0))
  const [isActive, setIsActive] = useState(banner?.isActive ?? true)
  const [busy, setBusy] = useState(false)

  async function upload(file: File | undefined) {
    if (!file) return
    setBusy(true)
    onError('')
    try {
      const form = new FormData()
      form.set('file', file)
      const response = await fetch('/api/admin/content/upload', { method: 'POST', body: form })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Upload failed.')
      setImageUrl(payload.data.url)
      setBlobPathname(payload.data.pathname)
    } catch (error) {
      onError(reportError(error, 'Content image could not be uploaded.'))
    } finally {
      setBusy(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    onError('')
    try {
      await saveBanner({ id: banner?.id, placement, title, body, href, imageUrl, blobPathname, sortOrder: Number(sortOrder), isActive })
      if (!banner) { setTitle(''); setBody(''); setHref(''); setImageUrl(''); setBlobPathname('') }
      await onChanged()
    } catch (error) {
      onError(reportError(error, 'The banner could not be saved.'))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!banner || !window.confirm('Delete this banner?')) return
    setBusy(true)
    try {
      await deleteBanner(banner.id)
      await onChanged()
    } catch (error) {
      onError(reportError(error, 'The banner could not be deleted.'))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-[#e4e2d8] bg-white p-4 md:grid-cols-[120px_1fr]">
      <div className="grid h-24 place-items-center overflow-hidden rounded-lg bg-[#f1efe6] text-xs text-[#68675f]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {imageUrl ? <img src={imageUrl} alt="" className="size-full object-contain" /> : 'No image'}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs">Placement<select disabled={!canEdit} value={placement} onChange={(e) => setPlacement(e.target.value as typeof placement)} className={inputClass}>{BANNER_PLACEMENTS.map((value) => <option key={value} value={value}>{placementLabels[value]}</option>)}</select></label>
        <label className="text-xs">Title / alt text<input disabled={!canEdit} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} className={inputClass} /></label>
        <label className="text-xs">Body<input disabled={!canEdit} value={body} maxLength={500} onChange={(e) => setBody(e.target.value)} className={inputClass} /></label>
        <label className="text-xs">Link (/path or https)<input disabled={!canEdit} value={href} maxLength={500} onChange={(e) => setHref(e.target.value)} className={inputClass} /></label>
        <label className="text-xs sm:col-span-2">Image URL <span aria-hidden="true" className="text-red-600">*</span><input disabled={!canEdit} required value={imageUrl} onChange={(e) => { setImageUrl(e.target.value); setBlobPathname('') }} className={inputClass} /></label>
        <label className="text-xs">Upload to Blob (max 4 MB)<input disabled={!canEdit || busy} type="file" accept="image/avif,image/jpeg,image/png,image/webp" onChange={(e) => void upload(e.target.files?.[0])} className="block w-full text-xs" /></label>
        <div className="flex items-end gap-3">
          <label className="w-24 text-xs">Order<input disabled={!canEdit} type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={inputClass} /></label>
          <label className="flex items-center gap-2 pb-2 text-xs"><input disabled={!canEdit} type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />Active</label>
        </div>
        {canEdit && (
          <div className="flex gap-2 sm:col-span-2">
            <button disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-[#1c1c1a] px-4 py-2 text-sm text-white disabled:opacity-60">{busy && <LoaderCircle size={14} className="animate-spin" />}{banner ? 'Save' : 'Add banner'}</button>
            {banner && <button type="button" disabled={busy} onClick={() => void remove()} aria-label="Delete banner" className="rounded-lg border border-[#d8d6cc] px-3 text-[#9b2c2c]"><Trash2 size={15} /></button>}
          </div>
        )}
      </div>
    </form>
  )
}

function ReviewEditor({ review, canEdit, onChanged, onError }: { review?: Content['reviews'][number]; canEdit: boolean; onChanged: () => Promise<void>; onError: (message: string) => void }) {
  const [author, setAuthor] = useState(review?.author ?? '')
  const [body, setBody] = useState(review?.body ?? '')
  const [sortOrder, setSortOrder] = useState(String(review?.sortOrder ?? 0))
  const [isActive, setIsActive] = useState(review?.isActive ?? true)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    onError('')
    try {
      await saveReview({ id: review?.id, author, body, sortOrder: Number(sortOrder), isActive })
      if (!review) { setAuthor(''); setBody('') }
      await onChanged()
    } catch (error) {
      onError(reportError(error, 'The review could not be saved.'))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!review || !window.confirm('Delete this review?')) return
    setBusy(true)
    try {
      await deleteReview(review.id)
      await onChanged()
    } catch (error) {
      onError(reportError(error, 'The review could not be deleted.'))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-2 rounded-2xl border border-[#e4e2d8] bg-white p-4 sm:grid-cols-[200px_1fr_80px]">
      <label className="text-xs">Author <span aria-hidden="true" className="text-red-600">*</span><input disabled={!canEdit} required value={author} maxLength={120} onChange={(e) => setAuthor(e.target.value)} className={inputClass} /></label>
      <label className="text-xs">Review <span aria-hidden="true" className="text-red-600">*</span><textarea disabled={!canEdit} required rows={2} value={body} maxLength={1000} onChange={(e) => setBody(e.target.value)} className={inputClass} /></label>
      <label className="text-xs">Order<input disabled={!canEdit} type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={inputClass} /></label>
      {canEdit && (
        <div className="flex items-center gap-3 sm:col-span-3">
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />Active</label>
          <button disabled={busy} className="rounded-lg bg-[#1c1c1a] px-4 py-2 text-sm text-white disabled:opacity-60">{review ? 'Save' : 'Add review'}</button>
          {review && <button type="button" disabled={busy} onClick={() => void remove()} aria-label="Delete review" className="rounded-lg border border-[#d8d6cc] px-3 py-2 text-[#9b2c2c]"><Trash2 size={15} /></button>}
        </div>
      )}
    </form>
  )
}

function SettingEditor({ name, value, canEdit, onChanged, onError }: { name: SettingKey; value: unknown; canEdit: boolean; onChanged: () => Promise<void>; onError: (message: string) => void }) {
  const [draft, setDraft] = useState(JSON.stringify(value ?? (name === 'announcements' || name === 'seo_sections' ? [] : {}), null, 2))
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    onError('')
    try {
      await saveSetting(name, JSON.parse(draft))
      await onChanged()
    } catch (error) {
      const errorMessage = error instanceof SyntaxError ? `${name}: invalid JSON.` : reportError(error, `${name} could not be saved.`)
      if (error instanceof SyntaxError) reportError(errorMessage)
      onError(errorMessage)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-[#e4e2d8] bg-white p-4">
      <label className="text-xs font-medium">{name} <span aria-hidden="true" className="text-red-600">*</span><textarea disabled={!canEdit} required rows={8} spellCheck={false} value={draft} onChange={(e) => setDraft(e.target.value)} className={`${inputClass} mt-1 font-mono text-xs`} /></label>
      {canEdit && <button disabled={busy} className="mt-2 rounded-lg bg-[#1c1c1a] px-4 py-2 text-sm text-white disabled:opacity-60">Save {name}</button>}
    </form>
  )
}

export function ContentManager({ canEdit }: { canEdit: boolean }) {
  const [content, setContent] = useState<Content | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setContent(await getContentAdmin())
      setLoading(false)
    } catch (loadError) {
      setError(reportError(loadError, 'Storefront content could not be loaded.'))
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <section className="min-w-0 flex-1 space-y-8" aria-labelledby="content-heading">
      <div>
        <h1 id="content-heading" className="text-2xl font-semibold">Storefront content</h1>
        <p className="mt-1 text-sm text-[#68675f]">Everything on the homepage, header and footer is read from the database. Uploaded images are stored in Vercel Blob; changes appear within minutes after cache refresh.</p>
      </div>
      {!canEdit && <p role="status" className="rounded-lg bg-[#f1efe6] p-3 text-sm">Staff accounts can view content but not change it.</p>}
      {error && <p role="alert" className="rounded-lg bg-[#fdecec] p-3 text-sm text-[#9b2c2c]">{error}</p>}
      {loading && <p className="flex items-center gap-2 text-sm"><LoaderCircle size={16} className="animate-spin" />Loading content…</p>}
      {content && (
        <>
          <div className="space-y-3">
            <h2 className="text-lg font-medium">Banners & images</h2>
            {canEdit && <BannerEditor key={`new-${content.banners.length}`} canEdit onChanged={load} onError={setError} />}
            {content.banners.length === 0 && <p className="text-sm text-[#68675f]">No banners yet. Homepage sections stay hidden until content exists.</p>}
            {content.banners.map((banner) => <BannerEditor key={`${banner.id}-${banner.updatedAt}`} banner={banner} canEdit={canEdit} onChanged={load} onError={setError} />)}
          </div>
          <div className="space-y-3">
            <h2 className="text-lg font-medium">Customer reviews</h2>
            {canEdit && <ReviewEditor key={`new-${content.reviews.length}`} canEdit onChanged={load} onError={setError} />}
            {content.reviews.map((review) => <ReviewEditor key={`${review.id}-${review.updatedAt}`} review={review} canEdit={canEdit} onChanged={load} onError={setError} />)}
          </div>
          <div className="space-y-3">
            <h2 className="text-lg font-medium">Text & settings (JSON)</h2>
            {SETTING_KEYS.map((key) => <SettingEditor key={`${key}-${JSON.stringify(content.settings[key])}`} name={key} value={content.settings[key]} canEdit={canEdit} onChanged={load} onError={setError} />)}
          </div>
        </>
      )}
    </section>
  )
}

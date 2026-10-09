'use client'

import { useState, type FormEvent } from 'react'
import { Archive, LoaderCircle, Pencil, Plus, RotateCcw, X } from 'lucide-react'
import { useSWRConfig } from 'swr'
import {
  archiveProductVariant,
  createProductVariant,
  updateProductVariant,
} from '@/app/actions/admin'
import type { AdminProduct } from '@/lib/hooks/use-admin-data'
import type { ProductVariant } from '@/lib/hooks/use-storefront-data'

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The variant could not be saved.'
}

const fieldClass = 'w-full rounded-lg border border-[#1c1c1a]/15 bg-white px-3 py-2.5 text-sm text-[#1c1c1a] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1c1c1a]'
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-full border border-[#1c1c1a]/15 bg-white px-3 py-2 text-xs font-medium hover:bg-[#f2f1ed] focus-visible:outline-2 focus-visible:outline-[#1c1c1a] disabled:cursor-wait disabled:opacity-60'

export function ProductVariantManager({
  product,
  canEdit,
  onChanged,
}: {
  product: AdminProduct
  canEdit: boolean
  onChanged: () => void
}) {
  const [editing, setEditing] = useState<ProductVariant | undefined>()
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const { mutate: globalMutate } = useSWRConfig()
  const activeCount = product.variants.filter((variant) => variant.isActive !== false).length

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusyId('form')
    setError('')
    const form = new FormData(event.currentTarget)
    const values = {
      sku: String(form.get('sku') ?? ''),
      name: String(form.get('name') ?? ''),
      color: String(form.get('color') ?? ''),
      powerDiopters: String(form.get('powerDiopters') ?? ''),
      baseCurve: String(form.get('baseCurve') ?? ''),
      diameterMm: String(form.get('diameterMm') ?? ''),
      packSize: String(form.get('packSize') ?? ''),
      price: String(form.get('price') ?? ''),
      currency: product.currency,
      stockQuantity: Number(form.get('stockQuantity')),
      isActive: form.get('isActive') === 'on',
    }
    try {
      if (editing) await updateProductVariant(product.id, editing.id, values)
      else await createProductVariant(product.id, values)
      setEditing(undefined)
      setCreating(false)
      await Promise.all([globalMutate('/api/admin/products'), globalMutate('/api/products'), globalMutate('/api/admin/metrics')])
      onChanged()
    } catch (saveError) {
      setError(errorMessage(saveError))
    } finally {
      setBusyId('')
    }
  }

  async function archive(variant: ProductVariant) {
    const restoring = variant.isActive === false
    if (!restoring && !window.confirm(`Remove ${variant.name} from the published product options?`)) return
    setBusyId(variant.id)
    setError('')
    try {
      if (restoring) {
        await updateProductVariant(product.id, variant.id, {
          sku: variant.sku ?? '',
          name: variant.name,
          color: variant.color ?? '',
          powerDiopters: variant.powerDiopters ?? '',
          baseCurve: variant.baseCurve ?? '',
          diameterMm: variant.diameterMm ?? '',
          packSize: variant.packSize ?? '',
          price: variant.price,
          currency: variant.currency,
          stockQuantity: variant.stockQuantity,
          isActive: true,
        })
      } else {
        await archiveProductVariant(product.id, variant.id)
      }
      await Promise.all([globalMutate('/api/admin/products'), globalMutate('/api/products'), globalMutate('/api/admin/metrics')])
      onChanged()
    } catch (archiveError) {
      setError(errorMessage(archiveError))
    } finally {
      setBusyId('')
    }
  }

  const formOpen = creating || editing

  return (
    <section className="mt-4 border-t border-[#1c1c1a]/10 pt-4" aria-label={`Variants for ${product.name}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Lens options</h3>
          <p className="mt-1 text-xs text-[#68675f]">{activeCount} active · price and stock summarize active options</p>
        </div>
        {canEdit && !formOpen && (
          <button type="button" onClick={() => setCreating(true)} className={buttonClass}><Plus size={14} /> Add option</button>
        )}
      </div>
      {error && <p role="alert" className="mt-3 border border-[#9b4a36]/25 bg-[#f8eeeb] px-3 py-2 text-xs text-[#753b2d]">{error}</p>}
      {product.variants.length === 0 ? (
        <p className="mt-4 border border-dashed border-[#1c1c1a]/20 px-4 py-5 text-xs text-[#68675f]">No lens options are listed for this product.</p>
      ) : (
        <ul className="mt-4 divide-y divide-[#1c1c1a]/10">
          {product.variants.map((variant) => (
            <li key={variant.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{variant.name} {variant.isActive === false && <span className="text-xs font-normal text-[#68675f]">(archived)</span>}</p>
                <p className="mt-1 text-xs text-[#68675f]">
                  {[variant.color, variant.powerDiopters ? `${variant.powerDiopters} D` : null, variant.baseCurve ? `BC ${variant.baseCurve}` : null, variant.diameterMm ? `DIA ${variant.diameterMm} mm` : null, variant.packSize ? `${variant.packSize} per pack` : null, variant.sku ? `SKU ${variant.sku}` : null].filter(Boolean).join(' · ') || 'No lens specifications entered'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs">{variant.currency} {variant.price} · {variant.stockQuantity} in stock</span>
                {canEdit && (
                  <>
                    <button type="button" disabled={Boolean(busyId)} onClick={() => { setCreating(false); setEditing(variant) }} className={buttonClass} aria-label={`Edit ${variant.name}`}><Pencil size={13} /></button>
                    <button type="button" disabled={Boolean(busyId)} onClick={() => void archive(variant)} className={buttonClass} aria-label={`${variant.isActive === false ? 'Restore' : 'Archive'} ${variant.name}`}>
                      {busyId === variant.id ? <LoaderCircle size={13} className="animate-spin" /> : variant.isActive === false ? <RotateCcw size={13} /> : <Archive size={13} />}
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {formOpen && (
        <form onSubmit={save} className="mt-4 border border-[#1c1c1a]/15 bg-[#f8f8f5] p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h4 className="text-sm font-medium">{editing ? `Edit ${editing.name}` : 'Add a lens option'}</h4>
            <button type="button" onClick={() => { setEditing(undefined); setCreating(false); setError('') }} aria-label="Close option editor" className="rounded-full p-2 hover:bg-[#eeede8]"><X size={15} /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-medium">Option name<input name="name" required maxLength={180} defaultValue={editing?.name} className={`${fieldClass} mt-1.5`} /></label>
            <label className="text-xs font-medium">Color<input name="color" maxLength={80} defaultValue={editing?.color ?? ''} className={`${fieldClass} mt-1.5`} /></label>
            <label className="text-xs font-medium">SKU<input name="sku" maxLength={64} defaultValue={editing?.sku ?? ''} className={`${fieldClass} mt-1.5`} /></label>
            <label className="text-xs font-medium">Power (D)<input name="powerDiopters" type="number" min="-9999.99" max="9999.99" step="0.01" defaultValue={editing?.powerDiopters ?? ''} className={`${fieldClass} mt-1.5`} /></label>
            <label className="text-xs font-medium">Base curve (mm)<input name="baseCurve" type="number" min="0.01" max="99.99" step="0.01" defaultValue={editing?.baseCurve ?? ''} className={`${fieldClass} mt-1.5`} /></label>
            <label className="text-xs font-medium">Diameter (mm)<input name="diameterMm" type="number" min="0.01" max="99.99" step="0.01" defaultValue={editing?.diameterMm ?? ''} className={`${fieldClass} mt-1.5`} /></label>
            <label className="text-xs font-medium">Pack size<input name="packSize" type="number" min="1" max="1000" step="1" defaultValue={editing?.packSize ?? ''} className={`${fieldClass} mt-1.5`} /></label>
            <label className="text-xs font-medium">Price ({product.currency})<input name="price" required inputMode="decimal" pattern="\d+(\.\d{1,2})?" defaultValue={editing?.price} className={`${fieldClass} mt-1.5`} /></label>
            <label className="text-xs font-medium">Stock quantity<input name="stockQuantity" type="number" min="0" step="1" required defaultValue={editing?.stockQuantity ?? 0} className={`${fieldClass} mt-1.5`} /></label>
            {editing && <label className="flex items-center gap-2 text-xs font-medium sm:col-span-2 lg:col-span-3"><input name="isActive" type="checkbox" defaultChecked={editing.isActive !== false} className="size-4 accent-[#52624f]" />Available on storefront</label>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="submit" disabled={Boolean(busyId)} className={buttonClass}>
              {busyId === 'form' && <LoaderCircle size={14} className="animate-spin" />}
              {busyId === 'form' ? 'Saving…' : editing ? 'Save option' : 'Create option'}
            </button>
            <button type="button" onClick={() => { setEditing(undefined); setCreating(false); setError('') }} className={buttonClass}>Cancel</button>
          </div>
        </form>
      )}
    </section>
  )
}

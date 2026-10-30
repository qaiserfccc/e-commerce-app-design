'use client'

import { useState, type FormEvent, type InvalidEvent } from 'react'
import useSWR from 'swr'
import { LoaderCircle, Plus, X } from 'lucide-react'
import { createProduct, getAdminCategories, setProductRelations, updateProduct } from '@/app/actions/catalog-admin'
import { getAdminBrands, getAdminLensShades, getAdminLensTypes } from '@/app/actions/catalog-taxonomy'
import { Alert, Field, flattenCategories, inputClass, primaryButton, secondaryButton, type AdminCategory } from '@/components/admin/admin-ui'
import { useAdminProducts, type AdminProduct } from '@/lib/hooks/use-admin-data'
import { notify, reportError } from '@/lib/ui/notifications'

type SpecRow = { label: string; value: string }

export function ProductEditor({ product, onSaved, onCancel }: { product?: AdminProduct; onSaved: () => void; onCancel: () => void }) {
  const { data: categoryData } = useSWR('admin-categories', () => getAdminCategories())
  const { data: brandData } = useSWR('admin-brands', () => getAdminBrands())
  const { data: shadeData } = useSWR('admin-lens-shades', () => getAdminLensShades())
  const { data: lensTypeData } = useSWR('admin-lens-types', () => getAdminLensTypes())
  const { products } = useAdminProducts()
  const categories = flattenCategories((categoryData ?? []) as AdminCategory[])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [specs, setSpecs] = useState<SpecRow[]>(product?.specs ?? [])
  const [related, setRelated] = useState<string[]>(product?.relatedProductIds ?? [])
  const [relatedQuery, setRelatedQuery] = useState('')
  const variantManaged = Boolean(product?.variants.some((variant) => variant.isActive !== false))

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const text = (name: string) => String(form.get(name) ?? '')
    const values = {
      name: text('name'),
      slug: text('slug'),
      categoryIds: form.getAll('categoryIds'),
      brandId: text('brandId') || null,
      lensShadeId: text('lensShadeId') || null,
      lensTypeId: text('lensTypeId') || null,
      sku: text('sku'),
      shortDescription: text('shortDescription'),
      description: text('description'),
      price: text('price'),
      compareAtPrice: text('compareAtPrice'),
      currency: text('currency').toUpperCase() || 'PKR',
      status: text('status'),
      diameterMm: text('diameterMm'),
      baseCurve: text('baseCurve'),
      waterContent: text('waterContent'),
      material: text('material'),
      wearDuration: text('wearDuration'),
      packContents: text('packContents'),
      powerType: text('powerType'),
      powerRange: text('powerRange'),
      uvProtection: form.get('uvProtection') === 'on',
      fdaApproved: form.get('fdaApproved') === 'on',
      features: text('features').split('\n'),
      specs,
      usageInstructions: text('usageInstructions'),
      isFeatured: form.get('isFeatured') === 'on',
      seoTitle: text('seoTitle'),
      seoDescription: text('seoDescription'),
    }
    setSaving(true)
    setError('')
    try {
      let id = product?.id
      if (product) await updateProduct(product.id, values)
      else id = (await createProduct(values)).id
      if (id) await setProductRelations(id, related)
      notify('info', product ? 'Product updated.' : 'Product created.')
      onSaved()
    } catch (saveError) {
      setError(reportError(saveError, 'The product could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  function showRequiredFieldError(event: InvalidEvent<HTMLFormElement>) {
    const field = event.target
    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) {
      notify('warning', field.validationMessage || 'Complete the required product fields before saving.')
    }
  }

  const candidates = products
    .filter((item) => item.id !== product?.id && !related.includes(item.id) && item.name.toLowerCase().includes(relatedQuery.toLowerCase()))
    .slice(0, 6)

  return (
    <form key={product?.id ?? 'new'} onSubmit={submit} onInvalidCapture={showRequiredFieldError} className="rounded-2xl border border-[#1c1c1a]/10 bg-white p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="font-medium">{product ? `Edit ${product.name}` : 'Add a product'}</h2>
        <button type="button" onClick={onCancel} aria-label="Close product editor" className="rounded-full p-2 hover:bg-[#f2f1ed]"><X size={17} /></button>
      </div>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {variantManaged && <div className="mb-4"><Alert tone="info">Price and stock are calculated from active lens options.</Alert></div>}
      {categories.length === 0 && <div className="mb-4"><Alert tone="info">Products can be saved without categories. You can attach categories later.</Alert></div>}

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold">Basics</legend>
        <Field label="Name" required><input name="name" required maxLength={200} defaultValue={product?.name} className={inputClass} /></Field>
        <Field label="Slug (blank = from name)"><input name="slug" maxLength={120} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={product?.slug} className={inputClass} /></Field>
        <Field label="Categories">
          <select name="categoryIds" multiple aria-describedby="product-category-help" defaultValue={product?.categoryIds ?? (product?.categoryId ? [product.categoryId] : [])} className={`${inputClass} min-h-32`}>
            {categories.map((row) => <option key={row.id} value={row.id}>{'\u2003'.repeat(row.depth)}{row.name}</option>)}
          </select>
          <span id="product-category-help" className="mt-1 block text-xs text-[#526b7b]">Optional. Select multiple categories, or leave empty until you are ready to assign them.</span>
        </Field>
        <Field label="Brand">
          <select name="brandId" defaultValue={product?.brandId ?? ''} className={inputClass}>
            <option value="">No brand</option>
            {(brandData ?? []).map((row) => <option key={row.id} value={row.id}>{row.name}{row.isActive ? '' : ' (inactive)'}</option>)}
          </select>
        </Field>
        <Field label="SKU"><input name="sku" maxLength={80} defaultValue={product?.sku ?? ''} className={inputClass} /></Field>
        <Field label="Status">
          <select name="status" defaultValue={product?.status ?? 'active'} className={inputClass}>
            <option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option>
          </select>
        </Field>
        <Field label="Price" required><input name="price" required inputMode="decimal" pattern="\d+(\.\d{1,2})?" readOnly={variantManaged} defaultValue={product?.price} className={inputClass} /></Field>
        <div className="grid grid-cols-[1fr_90px] gap-3">
          <Field label="Compare-at (old) price"><input name="compareAtPrice" inputMode="decimal" pattern="\d+(\.\d{1,2})?" defaultValue={product?.compareAtPrice ?? ''} className={inputClass} /></Field>
          <Field label="Currency"><input name="currency" maxLength={3} defaultValue={product?.currency ?? 'PKR'} className={inputClass} /></Field>
        </div>
        <div className="sm:col-span-2"><Field label="Short description"><input name="shortDescription" maxLength={400} defaultValue={product?.shortDescription ?? ''} className={inputClass} /></Field></div>
        <div className="sm:col-span-2"><Field label="Description"><textarea name="description" rows={5} maxLength={10000} defaultValue={product?.description ?? ''} className={inputClass} /></Field></div>
        <label className="flex items-start gap-2 text-sm sm:col-span-2">
          <input name="fdaApproved" type="checkbox" defaultChecked={product?.fdaApproved ?? false} className="mt-0.5" />
          <span>
            <span className="font-medium">FDA Approved</span>
            <span className="mt-1 block text-xs leading-5 text-[#526b7b]">Only enable after verifying current FDA approval documentation. This adds an FDA Approved stamp to product photos.</span>
          </span>
        </label>
      </fieldset>

      <fieldset className="mt-6 grid gap-4 sm:grid-cols-3">
        <legend className="mb-3 text-sm font-semibold">Lens details</legend>
        <Field label="Diameter (mm)"><input name="diameterMm" inputMode="decimal" placeholder="14.2" defaultValue={product?.diameterMm ?? ''} className={inputClass} /></Field>
        <Field label="Base curve (mm)"><input name="baseCurve" inputMode="decimal" placeholder="8.6" defaultValue={product?.baseCurve ?? ''} className={inputClass} /></Field>
        <Field label="Water content"><input name="waterContent" placeholder="38%" defaultValue={product?.waterContent ?? ''} className={inputClass} /></Field>
        <Field label="Material"><input name="material" defaultValue={product?.material ?? ''} className={inputClass} /></Field>
        <Field label="Lens type">
          <select name="lensTypeId" defaultValue={product?.lensTypeId ?? ''} className={inputClass}>
            <option value="">No lens type</option>
            {(lensTypeData ?? []).map((row) => <option key={row.id} value={row.id}>{row.name}{row.isActive ? '' : ' (inactive)'}</option>)}
          </select>
        </Field>
        <Field label="Wear duration"><input name="wearDuration" placeholder="Monthly / One day" defaultValue={product?.wearDuration ?? ''} className={inputClass} /></Field>
        <Field label="Pack contents"><input name="packContents" placeholder="2 lenses (1 pair)" defaultValue={product?.packContents ?? ''} className={inputClass} /></Field>
        <Field label="Power type"><input name="powerType" placeholder="Zero power / Prescription" defaultValue={product?.powerType ?? ''} className={inputClass} /></Field>
        <Field label="Power range"><input name="powerRange" placeholder="0.00 to -8.00" defaultValue={product?.powerRange ?? ''} className={inputClass} /></Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input name="uvProtection" type="checkbox" defaultChecked={product?.uvProtection} /> UV protection</label>
      </fieldset>

      <fieldset className="mt-6 grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold">Lens shade</legend>
        <Field label="Shade">
          <select name="lensShadeId" defaultValue={product?.lensShadeId ?? ''} className={inputClass}>
            <option value="">No shade</option>
            {(shadeData ?? []).map((row) => <option key={row.id} value={row.id}>{row.name}{row.isActive ? '' : ' (inactive)'}</option>)}
          </select>
        </Field>
        <p className="self-end pb-2 text-xs leading-5 text-[#68675f]">Add or edit shades in the Lens shades section.</p>
      </fieldset>

      <fieldset className="mt-6 grid gap-4">
        <legend className="mb-3 text-sm font-semibold">Features &amp; specifications</legend>
        <Field label="Key features (one per line)"><textarea name="features" rows={4} defaultValue={(product?.features ?? []).join('\n')} className={inputClass} /></Field>
        <div>
          <p className="text-xs font-medium text-[#55544e]">Extra specification rows</p>
          <ul className="mt-1.5 space-y-2">
            {specs.map((spec, index) => (
              <li key={index} className="flex gap-2">
                <input aria-label="Label" placeholder="Label" value={spec.label} onChange={(event) => setSpecs(specs.map((row, i) => i === index ? { ...row, label: event.target.value } : row))} className={inputClass} />
                <input aria-label="Value" placeholder="Value" value={spec.value} onChange={(event) => setSpecs(specs.map((row, i) => i === index ? { ...row, value: event.target.value } : row))} className={inputClass} />
                <button type="button" aria-label="Remove row" onClick={() => setSpecs(specs.filter((_, i) => i !== index))} className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-[#f2f1ed]"><X size={15} /></button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setSpecs([...specs, { label: '', value: '' }])} className={`${secondaryButton} mt-2`}><Plus size={14} className="mr-1 inline" />Add row</button>
        </div>
        <Field label="Usage / care instructions"><textarea name="usageInstructions" rows={3} defaultValue={product?.usageInstructions ?? ''} className={inputClass} /></Field>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="mb-3 text-sm font-semibold">Hand-picked related products</legend>
        <div className="flex flex-wrap gap-2">
          {related.map((id) => {
            const item = products.find((row) => row.id === id)
            return <span key={id} className="inline-flex items-center gap-1 rounded-full bg-[#f2f1ed] py-1 pl-3 pr-1 text-xs">{item?.name ?? id}<button type="button" aria-label="Remove related product" onClick={() => setRelated(related.filter((value) => value !== id))} className="grid size-5 place-items-center rounded-full hover:bg-white"><X size={12} /></button></span>
          })}
        </div>
        <input value={relatedQuery} onChange={(event) => setRelatedQuery(event.target.value)} placeholder="Search products to add…" aria-label="Search related products" className={`${inputClass} mt-2`} />
        {relatedQuery && <ul className="mt-1 rounded-lg border border-[#1c1c1a]/10">{candidates.map((item) => <li key={item.id}><button type="button" onClick={() => { setRelated([...related, item.id]); setRelatedQuery('') }} className="block w-full px-3 py-2 text-left text-sm hover:bg-[#f2f1ed]">{item.name} <span className="text-xs text-[#68675f]">· {item.category}</span></button></li>)}{candidates.length === 0 && <li className="px-3 py-2 text-xs text-[#68675f]">No matches.</li>}</ul>}
      </fieldset>

      <fieldset className="mt-6 grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold">SEO</legend>
        <Field label="SEO title"><input name="seoTitle" maxLength={160} defaultValue={product?.seoTitle ?? ''} className={inputClass} /></Field>
        <Field label="SEO description"><input name="seoDescription" maxLength={320} defaultValue={product?.seoDescription ?? ''} className={inputClass} /></Field>
      </fieldset>

      <div className="mt-6 flex flex-wrap gap-2">
        <button type="submit" disabled={saving || categories.length === 0} className={primaryButton}>{saving && <LoaderCircle size={15} className="animate-spin" />}{saving ? 'Saving…' : product ? 'Save product' : 'Create product'}</button>
        <button type="button" onClick={onCancel} className={secondaryButton}>Cancel</button>
      </div>
    </form>
  )
}

'use client'

import { useDeferredValue, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  Activity, BarChart3, ClipboardList, LayoutDashboard, LoaderCircle,
  LogOut, Package, Plus, Search, ShoppingBag, ShieldCheck, Users, X,
} from 'lucide-react'
import { useSWRConfig } from 'swr'
import {
  createProduct,
  deleteProduct,
  deleteProductAsset,
  updateOrderStatus,
  updateProduct,
  updateProductStock,
  updateCustomer,
} from '@/app/actions/admin'
import {
  useAdminActivity,
  useAdminCustomers,
  useAdminMetrics,
  useAdminOrders,
  useAdminProducts,
  type AdminCustomer,
  type AdminOrder,
  type AdminProduct,
} from '@/lib/hooks/use-admin-data'
import { ProjectKanban } from '@/components/admin/project-kanban'

type Section = 'overview' | 'products' | 'orders' | 'customers' | 'analytics' | 'project-plan'

const sections: Array<{ id: Section; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'project-plan', label: 'Project Kanban', icon: ClipboardList },
]

function currencyLabel(value: string, currency: string) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return `${currency} ${value}`
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The request could not be completed.'
}

function PanelHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-.04em]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68675f]">{description}</p>
      </div>
      {action}
    </div>
  )
}

function Notice({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'info' }) {
  const color = tone === 'error' ? 'border-[#9b4a36]/25 bg-[#f8eeeb] text-[#753b2d]' : 'border-[#52624f]/20 bg-[#e2e7df] text-[#465342]'
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm leading-5 ${color}`}>{children}</div>
}

function LoadingRows({ label }: { label: string }) {
  return (
    <div className="space-y-3" role="status" aria-label={label}>
      {[0, 1, 2].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-[#e8e6e0]" />)}
    </div>
  )
}

function PageControls({ offset, total, pageSize, onChange }: { offset: number; total: number; pageSize: number; onChange: (offset: number) => void }) {
  if (total <= pageSize) return null
  const start = offset + 1
  const end = Math.min(offset + pageSize, total)
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-[#68675f]">Showing {start}–{end} of {total}</p>
      <div className="flex gap-2">
        <button type="button" disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - pageSize))} className={secondaryButton}>Previous</button>
        <button type="button" disabled={end >= total} onClick={() => onChange(offset + pageSize)} className={secondaryButton}>Next</button>
      </div>
    </div>
  )
}

function AdminLogin({ onSignedIn, configurationMessage }: { onSignedIn: (email: string, expiresAt: number) => void; configurationMessage?: string }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to sign in.')
      if (typeof result.expiresAt !== 'number') throw new Error('The sign-in session could not be established. Try again.')
      onSignedIn(email.trim(), result.expiresAt)
    } catch (submitError) {
      setError(errorMessage(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-lg rounded-2xl border border-[#1c1c1a]/10 bg-white p-6 sm:p-8">
      <div className="mb-6 grid size-11 place-items-center rounded-full bg-[#e2e7df] text-[#52624f]"><ShieldCheck size={20} /></div>
      <h1 className="text-2xl font-semibold tracking-[-.04em]">Admin sign in</h1>
      <p className="mt-2 text-sm leading-6 text-[#68675f]">Sign in to view store operations and customer information.</p>
      {configurationMessage ? (
        <div className="mt-5 space-y-3">
          <Notice>{configurationMessage}</Notice>
          <p className="text-xs leading-5 text-[#68675f]">Configure `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` in the project environment. Use at least 16 characters for the password and 32 characters for the session secret.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          {error && <Notice>{error}</Notice>}
          <label className="block text-sm font-medium">
            Email
            <input
              required
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#1c1c1a]/15 bg-white px-3 py-2.5 text-sm font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c1c1a]"
            />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#1c1c1a]/15 bg-white px-3 py-2.5 text-sm font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c1c1a]"
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1c1c1a] px-4 py-3 text-sm font-medium text-white hover:bg-[#353531] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c1c1a] disabled:cursor-wait disabled:opacity-60"
          >
            {submitting && <LoaderCircle size={16} className="animate-spin" />}
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      )}
    </section>
  )
}

function AdminOverview({ onNavigate }: { onNavigate: (section: Section) => void }) {
  const { metrics, isLoading, isError, error, mutate } = useAdminMetrics()
  const { orders, isLoading: ordersLoading, isError: ordersError, error: ordersLoadError, mutate: mutateOrders } = useAdminOrders()
  const { products, isLoading: productsLoading, isError: productsError, error: productsLoadError, mutate: mutateProducts } = useAdminProducts()

  async function refresh() {
    await Promise.all([mutate(), mutateOrders(), mutateProducts()])
  }

  return (
    <section className="min-w-0 flex-1">
      <PanelHeading
        title="Store overview"
        description="Current catalog, order, and customer totals from the connected database."
        action={<button type="button" onClick={() => void refresh()} className="rounded-full border border-[#1c1c1a]/15 bg-white px-4 py-2.5 text-sm hover:bg-[#f2f1ed] focus-visible:outline-2 focus-visible:outline-[#1c1c1a]">Refresh data</button>}
      />
      {(isError || productsError || ordersError) && <div className="mb-5"><Notice>{errorMessage(error ?? productsLoadError ?? ordersLoadError)}</Notice></div>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Catalog products" value={productsLoading || productsError ? '—' : String(products.length)} icon={<Package size={18} />} />
        <MetricCard label="All orders" value={isLoading || !metrics ? '—' : String(metrics.orders.totalOrders)} icon={<ShoppingBag size={18} />} />
        <MetricCard label="Pending orders" value={isLoading || !metrics ? '—' : String(metrics.orders.pendingOrders)} icon={<Activity size={18} />} />
        <MetricCard label="Customers" value={isLoading || !metrics ? '—' : String(metrics.customers.totalCustomers)} icon={<Users size={18} />} />
      </div>
      <section className="mt-6 rounded-2xl border border-[#1c1c1a]/10 bg-white p-5">
        <h2 className="font-medium">Recognized order value</h2>
        <p className="mt-1 text-xs leading-5 text-[#68675f]">Paid, processing, shipped, and delivered orders, grouped by currency. Pending and cancelled orders are excluded.</p>
        {isError ? (
          <p className="mt-4 text-sm text-[#753b2d]">Order value could not be loaded.</p>
        ) : isLoading || !metrics ? (
          <div className="mt-5 h-8 w-48 animate-pulse rounded bg-[#e8e6e0]" />
        ) : metrics.orders.revenueByCurrency.length ? (
          <div className="mt-4 flex flex-wrap gap-4">
            {metrics.orders.revenueByCurrency.map((item) => (
              <div key={item.currency} className="min-w-40">
                <p className="text-xs text-[#68675f]">{item.currency}</p>
                <p className="mt-1 text-2xl font-semibold tracking-[-.04em]">{currencyLabel(item.totalRevenue, item.currency)}</p>
                <p className="mt-1 text-xs text-[#68675f]">Average {currencyLabel(item.avgOrderValue, item.currency)}</p>
              </div>
            ))}
          </div>
        ) : <p className="mt-4 text-sm text-[#68675f]">No recognized orders yet.</p>}
      </section>
      <section className="mt-6 rounded-2xl border border-[#1c1c1a]/10 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-medium">Recent orders</h2><p className="mt-1 text-xs text-[#68675f]">Latest records from the shared store database.</p></div>
          <button type="button" onClick={() => onNavigate('orders')} className="text-sm underline underline-offset-4">Open orders</button>
        </div>
        {ordersLoading ? <p className="mt-5 text-sm text-[#68675f]">Loading orders…</p> : ordersError ? <p className="mt-5 text-sm text-[#753b2d]">Order data is unavailable.</p> : orders.length === 0 ? (
          <p className="mt-5 text-sm text-[#68675f]">No orders have been recorded.</p>
        ) : (
          <div className="mt-4 divide-y divide-[#1c1c1a]/10">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span className="font-medium">Order #{order.orderNumber}</span>
                <span className="text-[#68675f]">{order.customer?.email ?? 'Customer unavailable'}</span>
                <span className="rounded-full bg-[#f2f1ed] px-2.5 py-1 text-xs capitalize">{order.status}</span>
                <span>{currencyLabel(order.total, order.currency)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#1c1c1a]/10 bg-white p-5">
      <span className="text-[#65645e]">{icon}</span>
      <p className="mt-5 text-xs text-[#68675f]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-[-.04em]">{value}</p>
    </div>
  )
}

function ProductEditor({
  product,
  onSaved,
  onCancel,
}: {
  product?: AdminProduct
  onSaved: () => void
  onCancel: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const form = new FormData(event.currentTarget)
    const values = {
      name: String(form.get('name') ?? ''),
      slug: String(form.get('slug') ?? ''),
      description: String(form.get('description') ?? ''),
      category: String(form.get('category') ?? ''),
      price: String(form.get('price') ?? ''),
      currency: String(form.get('currency') ?? 'USD'),
      stockQuantity: Number(form.get('stockQuantity')),
      status: String(form.get('status') ?? 'active'),
    }
    try {
      if (product) await updateProduct(product.id, values)
      else await createProduct(values)
      onSaved()
    } catch (saveError) {
      setError(errorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form key={product?.id ?? 'new'} onSubmit={submit} className="rounded-2xl border border-[#1c1c1a]/10 bg-white p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="font-medium">{product ? `Edit ${product.name}` : 'Add a product'}</h2>
        <button type="button" onClick={onCancel} aria-label="Close product editor" className="rounded-full p-2 hover:bg-[#f2f1ed] focus-visible:outline-2 focus-visible:outline-[#1c1c1a]"><X size={17} /></button>
      </div>
      {error && <div className="mb-4"><Notice>{error}</Notice></div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name"><input name="name" required maxLength={180} defaultValue={product?.name} className={inputClass} /></Field>
        <Field label="Slug"><input name="slug" required maxLength={180} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={product?.slug} className={inputClass} /></Field>
        <Field label="Category"><input name="category" required maxLength={100} defaultValue={product?.category} className={inputClass} /></Field>
        <div className="grid grid-cols-[1fr_100px] gap-3">
          <Field label="Price"><input name="price" required inputMode="decimal" pattern="\d+(\.\d{1,2})?" defaultValue={product?.price} className={inputClass} /></Field>
          <Field label="Currency"><input name="currency" required maxLength={3} pattern="[A-Za-z]{3}" defaultValue={product?.currency ?? 'USD'} className={inputClass} /></Field>
        </div>
        <Field label="Stock quantity"><input name="stockQuantity" type="number" required min="0" step="1" defaultValue={product?.stockQuantity ?? 0} className={inputClass} /></Field>
        <Field label="Status">
          <select name="status" defaultValue={product?.status ?? 'active'} className={inputClass}>
            <option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option>
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description"><textarea name="description" rows={3} maxLength={5000} defaultValue={product?.description ?? ''} className={inputClass} /></Field>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className={primaryButton}>
          {saving && <LoaderCircle size={15} className="animate-spin" />}
          {saving ? 'Saving…' : product ? 'Save product' : 'Create product'}
        </button>
        <button type="button" onClick={onCancel} className={secondaryButton}>Cancel</button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-xs font-medium text-[#55544e]">{label}<div className="mt-1.5">{children}</div></label>
}

const inputClass = 'w-full rounded-lg border border-[#1c1c1a]/15 bg-white px-3 py-2.5 text-sm text-[#1c1c1a] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#1c1c1a]'
const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-full bg-[#1c1c1a] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#353531] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c1c1a] disabled:cursor-wait disabled:opacity-60'
const secondaryButton = 'rounded-full border border-[#1c1c1a]/15 bg-white px-4 py-2.5 text-sm hover:bg-[#f2f1ed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c1c1a] disabled:opacity-60'

function ProductWorkspace() {
  const { products, isLoading, isError, error, mutate } = useAdminProducts()
  const { mutate: globalMutate } = useSWRConfig()
  const [editing, setEditing] = useState<AdminProduct | undefined>()
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState('')

  const filtered = useMemo(() => products.filter((product) => `${product.name} ${product.category} ${product.slug}`.toLowerCase().includes(query.toLowerCase())), [products, query])

  async function refresh() {
    setCreating(false)
    setEditing(undefined)
    await Promise.all([mutate(), globalMutate('/api/products'), globalMutate('/api/admin/metrics')])
  }

  async function changeStock(product: AdminProduct, quantity: number) {
    setBusyId(product.id)
    setMessage('')
    try {
      await updateProductStock(product.id, quantity)
      await refresh()
    } catch (updateError) {
      setMessage(errorMessage(updateError))
    } finally {
      setBusyId('')
    }
  }

  async function archive(product: AdminProduct) {
    if (!window.confirm(`Archive ${product.name}? It will no longer appear in the storefront.`)) return
    setBusyId(product.id)
    setMessage('')
    try {
      await deleteProduct(product.id)
      await refresh()
    } catch (deleteError) {
      setMessage(errorMessage(deleteError))
    } finally {
      setBusyId('')
    }
  }

  return (
    <section className="min-w-0 flex-1">
      <PanelHeading
        title="Products"
        description="Manage catalog details and inventory. Changes save to the shared database and revalidate the storefront."
        action={<button type="button" onClick={() => { setEditing(undefined); setCreating(true) }} className={primaryButton}><Plus size={16} /> Add product</button>}
      />
      {(message || isError) && <div className="mb-4"><Notice>{message || errorMessage(error)}</Notice></div>}
      {(creating || editing) && <div className="mb-5"><ProductEditor product={editing} onSaved={() => void refresh()} onCancel={() => { setCreating(false); setEditing(undefined) }} /></div>}
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#1c1c1a]/10 bg-white px-3">
        <Search size={16} className="text-[#68675f]" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter catalog" aria-label="Filter products" className="w-full bg-transparent py-3 text-sm outline-none" />
      </div>
      {isLoading ? <LoadingRows label="Loading products" /> : isError ? null : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#1c1c1a]/20 bg-white/60 px-5 py-10 text-center text-sm text-[#68675f]">
          {products.length ? 'No products match this filter.' : 'No products are in the catalog yet. Add a product to publish your first listing.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((product) => (
            <ProductRow
              key={`${product.id}-${product.stockQuantity}`}
              product={product}
              busy={busyId === product.id}
              onEdit={() => { setCreating(false); setEditing(product) }}
              onArchive={() => void archive(product)}
              onStock={(quantity) => void changeStock(product, quantity)}
              onRefresh={() => void refresh()}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function ProductRow({
  product,
  busy,
  onEdit,
  onArchive,
  onStock,
  onRefresh,
}: {
  product: AdminProduct
  busy: boolean
  onEdit: () => void
  onArchive: () => void
  onStock: (quantity: number) => void
  onRefresh: () => void
}) {
  const [quantity, setQuantity] = useState(String(product.stockQuantity))
  const [expanded, setExpanded] = useState(false)
  const [assetMessage, setAssetMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const { mutate: globalMutate } = useSWRConfig()

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    if (!(form.get('file') instanceof File)) return
    setUploading(true)
    setAssetMessage('')
    try {
      const response = await fetch(`/api/admin/products/${product.id}/assets`, { method: 'POST', body: form })
      const result = await response.json()
      if (response.status === 401) window.dispatchEvent(new Event('admin-session-expired'))
      if (!response.ok) throw new Error(result.error || 'Image upload failed.')
      await Promise.all([globalMutate('/api/admin/products'), globalMutate('/api/products'), globalMutate(`/api/products/${product.slug}`)])
      formElement.reset()
      onRefresh()
    } catch (uploadError) {
      setAssetMessage(errorMessage(uploadError))
    } finally {
      setUploading(false)
    }
  }

  async function removeAsset(assetId: string) {
    setAssetMessage('')
    try {
      const response = await fetch(`/api/admin/assets/${assetId}`, { method: 'DELETE' })
      const result = await response.json()
      if (response.status === 401) window.dispatchEvent(new Event('admin-session-expired'))
      if (!response.ok) throw new Error(result.error || 'Image deletion failed.')
      await Promise.all([globalMutate('/api/admin/products'), globalMutate('/api/products')])
      onRefresh()
    } catch (removeError) {
      setAssetMessage(errorMessage(removeError))
    }
  }

  return (
    <article className="rounded-2xl border border-[#1c1c1a]/10 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {product.heroImageUrl ? <img src={product.heroImageUrl} alt="" className="size-14 shrink-0 rounded-lg object-cover" /> : <div aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-lg bg-[#f2f1ed]"><Package size={18} /></div>}
          <div className="min-w-0">
            <h2 className="truncate text-sm font-medium">{product.name}</h2>
            <p className="mt-1 text-xs text-[#68675f]">{product.category} · {product.slug}</p>
            <p className="mt-1 text-xs text-[#68675f]">{currencyLabel(product.price, product.currency)} · <span className="capitalize">{product.status}</span></p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`stock-${product.id}`}>Stock quantity for {product.name}</label>
          <input id={`stock-${product.id}`} type="number" min="0" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="w-20 rounded-lg border border-[#1c1c1a]/15 px-2 py-2 text-sm" />
          <button type="button" disabled={busy || !/^\d+$/.test(quantity) || Number(quantity) === product.stockQuantity} onClick={() => onStock(Number(quantity))} className={secondaryButton}>Save stock</button>
          <button type="button" disabled={busy} onClick={onEdit} className={secondaryButton}>Edit</button>
          {product.status !== 'archived' && <button type="button" disabled={busy} onClick={onArchive} className="rounded-full border border-[#9b4a36]/30 px-4 py-2.5 text-sm text-[#753b2d] hover:bg-[#f8eeeb] disabled:opacity-60">Archive</button>}
        </div>
      </div>
      <button type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} className="mt-4 text-xs underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-[#1c1c1a]">
        {expanded ? 'Hide product images' : `Manage product images (${product.assets.length})`}
      </button>
      {expanded && (
        <div className="mt-4 border-t border-[#1c1c1a]/10 pt-4">
          {assetMessage && <div className="mb-3"><Notice>{assetMessage}</Notice></div>}
          <form onSubmit={upload} className="flex flex-wrap items-end gap-3">
            <Field label="Image file"><input name="file" type="file" required accept="image/jpeg,image/png,image/webp,image/avif" className="max-w-full text-xs file:mr-3 file:rounded-full file:border-0 file:bg-[#f2f1ed] file:px-3 file:py-2" /></Field>
            <Field label="Image description"><input name="altText" maxLength={500} placeholder={product.name} className={`${inputClass} min-w-48`} /></Field>
            <button type="submit" disabled={uploading} className={primaryButton}>{uploading && <LoaderCircle size={15} className="animate-spin" />}{uploading ? 'Uploading…' : 'Upload image'}</button>
          </form>
          <p className="mt-2 text-xs text-[#68675f]">JPEG, PNG, WebP, or AVIF · maximum 4 MB.</p>
          {product.assets.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-3">
              {product.assets.map((asset) => (
                <li key={asset.id} className="relative">
                  {asset.blobUrl ? <img src={asset.blobUrl} alt={asset.altText ?? ''} className="size-20 rounded-lg object-cover" /> : <div className="grid size-20 place-items-center rounded-lg bg-[#f2f1ed] text-xs">Missing URL</div>}
                  <button type="button" onClick={() => void removeAsset(asset.id)} aria-label={`Delete ${asset.altText || 'product image'}`} className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full bg-white text-[#753b2d] shadow-sm focus-visible:outline-2 focus-visible:outline-[#1c1c1a]"><X size={14} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  )
}

function OrdersWorkspace() {
  const [offset, setOffset] = useState(0)
  const [filter, setFilter] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState('')
  const { orders, total, isLoading, isError, error, mutate } = useAdminOrders(offset, filter)
  const { mutate: globalMutate } = useSWRConfig()

  useEffect(() => { setOffset(0) }, [filter])
  useEffect(() => {
    if (!isLoading && offset >= total && offset > 0) setOffset(Math.max(0, Math.floor((total - 1) / 50) * 50))
  }, [isLoading, offset, total])

  async function changeStatus(orderId: string, status: string) {
    setSaving(orderId)
    setMessage('')
    try {
      await updateOrderStatus(orderId, status)
      await Promise.all([mutate(), globalMutate('/api/admin/metrics'), globalMutate('/api/admin/activity')])
    } catch (statusError) {
      setMessage(errorMessage(statusError))
    } finally {
      setSaving('')
    }
  }

  return (
    <section className="min-w-0 flex-1">
      <PanelHeading title="Orders" description={`${total ? `Showing ${offset + 1}–${Math.min(offset + orders.length, total)} of ${total}` : 'No orders'} from the shared database. Status changes are validated and audit logged.`} />
      {message && <div className="mb-4"><Notice>{message}</Notice></div>}
      {isError && <div className="mb-4"><Notice>{errorMessage(error)}</Notice></div>}
      <label className="mb-4 block max-w-xs text-xs font-medium text-[#55544e]">Filter status
        <select value={filter} onChange={(event) => setFilter(event.target.value)} className={`${inputClass} mt-1.5`}>
          <option value="">All statuses</option>
          {['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'].map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </label>
      {isLoading ? <LoadingRows label="Loading orders" /> : isError ? null : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#1c1c1a]/20 bg-white/60 px-5 py-10 text-center text-sm text-[#68675f]">No matching orders are recorded.</div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => <OrderRow key={order.id} order={order} saving={saving === order.id} onStatus={(status) => void changeStatus(order.id, status)} />)}
        </div>
      )}
      <PageControls offset={offset} total={total} pageSize={50} onChange={setOffset} />
    </section>
  )
}

function OrderRow({ order, saving, onStatus }: { order: AdminOrder; saving: boolean; onStatus: (status: string) => void }) {
  const customerName = [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(' ')
  return (
    <article className="rounded-2xl border border-[#1c1c1a]/10 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium">Order #{order.orderNumber}</h2>
          <p className="mt-1 text-xs text-[#68675f]">{customerName || order.customer?.email || 'Customer unavailable'}{customerName && order.customer?.email ? ` · ${order.customer.email}` : ''}</p>
          <p className="mt-1 text-xs text-[#68675f]">{new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{currencyLabel(order.total, order.currency)}</p>
          <label className="mt-2 block text-left text-[11px] text-[#68675f]">Order status
            <select disabled={saving} value={order.status} onChange={(event) => onStatus(event.target.value)} className="mt-1 block rounded-lg border border-[#1c1c1a]/15 bg-white px-2 py-1.5 text-xs capitalize">
              {['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
        </div>
      </div>
      <details className="mt-4 border-t border-[#1c1c1a]/10 pt-3">
        <summary className="cursor-pointer text-xs underline underline-offset-4">Items and shipping details</summary>
        <ul className="mt-3 space-y-2">
          {order.items.map((item) => <li key={item.id} className="flex justify-between gap-3 text-xs"><span>{item.productName} × {item.quantity}</span><span>{currencyLabel(item.lineTotal, order.currency)}</span></li>)}
        </ul>
        <div className="mt-3 text-xs leading-5 text-[#68675f]">
          <p className="font-medium text-[#1c1c1a]">Shipping address</p>
          {Object.entries(order.shippingAddress ?? {}).map(([key, value]) => (
            <p key={key}>{String(value)}</p>
          ))}
        </div>
      </details>
    </article>
  )
}

function CustomersWorkspace() {
  const [offset, setOffset] = useState(0)
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query.trim())
  const { customers, total, isLoading, isError, error, mutate } = useAdminCustomers(offset, deferredQuery)
  const { mutate: globalMutate } = useSWRConfig()
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState('')

  useEffect(() => { setOffset(0) }, [deferredQuery])

  async function updateMarketing(customer: AdminCustomer, marketingOptIn: boolean) {
    setSaving(customer.id)
    setMessage('')
    try {
      await updateCustomer(customer.id, { marketingOptIn })
      await Promise.all([mutate(), globalMutate('/api/admin/activity')])
    } catch (updateError) {
      setMessage(errorMessage(updateError))
    } finally {
      setSaving('')
    }
  }

  return (
    <section className="min-w-0 flex-1">
      <PanelHeading title="Customers" description={`${total ? `Showing ${offset + 1}–${Math.min(offset + customers.length, total)} of ${total}` : 'No customer records'} from the shared database. Personal data is shown only to signed-in admins.`} />
      {(message || isError) && <div className="mb-4"><Notice>{message || errorMessage(error)}</Notice></div>}
      <label className="mb-4 flex max-w-lg items-center gap-2 rounded-xl border border-[#1c1c1a]/10 bg-white px-3">
        <Search size={16} className="text-[#68675f]" />
        <span className="sr-only">Search customers</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email" className="w-full bg-transparent py-3 text-sm outline-none" />
      </label>
      {isLoading ? <LoadingRows label="Loading customers" /> : isError ? null : customers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#1c1c1a]/20 bg-white/60 px-5 py-10 text-center text-sm text-[#68675f]">{deferredQuery ? 'No customers match this search.' : 'No customer records are in the database.'}</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#1c1c1a]/10 bg-white">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-[#f2f1ed] text-xs text-[#55544e]"><tr><th className="px-4 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium">Phone</th><th className="px-4 py-3 font-medium">Joined</th><th className="px-4 py-3 font-medium">Marketing</th></tr></thead>
            <tbody className="divide-y divide-[#1c1c1a]/10">
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td className="px-4 py-3"><p>{[customer.firstName, customer.lastName].filter(Boolean).join(' ') || 'Name not provided'}</p><p className="mt-1 text-xs text-[#68675f]">{customer.email}</p></td>
                  <td className="px-4 py-3 text-[#68675f]">{customer.phone || '—'}</td>
                  <td className="px-4 py-3 text-xs text-[#68675f]">{new Date(customer.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={customer.marketingOptIn} disabled={saving === customer.id} onChange={(event) => void updateMarketing(customer, event.target.checked)} className="size-4 accent-[#52624f]" />
                      {customer.marketingOptIn ? 'Opted in' : 'Not opted in'}
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <PageControls offset={offset} total={total} pageSize={50} onChange={setOffset} />
    </section>
  )
}

function AnalyticsWorkspace() {
  const { metrics, isLoading, isError, error } = useAdminMetrics()
  const { activity, isLoading: activityLoading, isError: activityError, error: activityLoadError } = useAdminActivity()
  const statusRows = metrics ? Object.entries(metrics.orders.ordersByStatus) : []

  return (
    <section className="min-w-0 flex-1">
      <PanelHeading title="Analytics" description="Order value is grouped by currency and includes paid, processing, shipped, and delivered orders only." />
      {(isError || activityError) && <div className="mb-4"><Notice>{errorMessage(error ?? activityLoadError)}</Notice></div>}
      <div className="grid gap-3 sm:grid-cols-2">
        {isLoading || !metrics ? <LoadingRows label="Loading analytics" /> : (
          <>
            <MetricCard label="All recorded orders" value={String(metrics.orders.totalOrders)} icon={<ShoppingBag size={18} />} />
            <MetricCard label="Pending orders" value={String(metrics.orders.pendingOrders)} icon={<Activity size={18} />} />
          </>
        )}
      </div>
      <section className="mt-6 rounded-2xl border border-[#1c1c1a]/10 bg-white p-5">
        <h2 className="font-medium">Recognized order value</h2>
        <p className="mt-1 text-xs text-[#68675f]">Grouped by currency; excludes pending, cancelled, and refunded orders.</p>
        {isError ? <p className="mt-4 text-sm text-[#753b2d]">Order value is unavailable.</p> : !metrics || isLoading ? <p className="mt-4 text-sm text-[#68675f]">Loading totals…</p> : metrics.orders.revenueByCurrency.length ? (
          <div className="mt-4 flex flex-wrap gap-6">
            {metrics.orders.revenueByCurrency.map((entry) => (
              <div key={entry.currency}>
                <p className="text-2xl font-semibold">{currencyLabel(entry.totalRevenue, entry.currency)}</p>
                <p className="mt-1 text-xs text-[#68675f]">Average order: {currencyLabel(entry.avgOrderValue, entry.currency)}</p>
              </div>
            ))}
          </div>
        ) : <p className="mt-4 text-sm text-[#68675f]">No recognized orders yet.</p>}
      </section>
      <section className="mt-6 rounded-2xl border border-[#1c1c1a]/10 bg-white p-5">
        <h2 className="font-medium">Orders by status</h2>
        {isError ? <p className="mt-4 text-sm text-[#68675f]">Order analytics are unavailable right now.</p> : !metrics || isLoading ? <p className="mt-4 text-sm text-[#68675f]">Loading status totals…</p> : statusRows.length ? (
          <div className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {statusRows.map(([status, count]) => <div key={status} className="flex justify-between border-b border-[#1c1c1a]/10 py-2 text-sm"><span className="capitalize">{status}</span><strong>{count}</strong></div>)}
          </div>
        ) : <p className="mt-4 text-sm text-[#68675f]">No orders have been recorded.</p>}
      </section>
      <section className="mt-6 rounded-2xl border border-[#1c1c1a]/10 bg-white p-5">
        <h2 className="font-medium">Recent activity</h2>
        {activityLoading ? <p className="mt-4 text-sm text-[#68675f]">Loading activity…</p> : activity.length ? (
          <ul className="mt-4 divide-y divide-[#1c1c1a]/10">
            {activity.map((event) => <li key={event.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span><span className="capitalize">{event.entityType}</span> · <span className="text-[#68675f]">{event.eventType.replaceAll('_', ' ')}</span></span><time className="text-xs text-[#68675f]">{new Date(event.createdAt).toLocaleString()}</time></li>)}
          </ul>
        ) : <p className="mt-4 text-sm text-[#68675f]">No activity has been recorded.</p>}
      </section>
    </section>
  )
}

export function AdminWorkspace() {
  const [section, setSection] = useState<Section>('overview')
  const [session, setSession] = useState<{ checked: boolean; authenticated: boolean; email?: string; expiresAt?: number; configurationMessage?: string; error?: string }>({ checked: false, authenticated: false })
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/admin/session', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json()
        if (!active) return
        if (response.status === 503 && result.configured === false) {
          setSession({ checked: true, authenticated: false, configurationMessage: result.error })
        } else if (!response.ok) {
          setSession({ checked: true, authenticated: false, error: result.error || 'Admin access is unavailable.' })
        } else {
          setSession({ checked: true, authenticated: Boolean(result.authenticated), email: result.email, expiresAt: result.expiresAt })
        }
      })
      .catch(() => {
        if (active) setSession({ checked: true, authenticated: false, error: 'Could not check the admin session. Refresh the page to try again.' })
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!session.authenticated || !session.expiresAt) return
    const remaining = session.expiresAt * 1000 - Date.now()
    if (remaining <= 0) {
      setSession({ checked: true, authenticated: false, error: 'Your admin session expired. Sign in again to continue.' })
      return
    }
    const timeout = window.setTimeout(
      () => setSession({ checked: true, authenticated: false, error: 'Your admin session expired. Sign in again to continue.' }),
      remaining,
    )
    return () => window.clearTimeout(timeout)
  }, [session.authenticated, session.expiresAt])

  useEffect(() => {
    const expireSession = () => setSession({ checked: true, authenticated: false, error: 'Your admin session expired. Sign in again to continue.' })
    window.addEventListener('admin-session-expired', expireSession)
    return () => window.removeEventListener('admin-session-expired', expireSession)
  }, [])

  async function signOut() {
    setSigningOut(true)
    try {
      const response = await fetch('/api/admin/session', { method: 'DELETE' })
      if (!response.ok) throw new Error('Could not sign out. Refresh and try again.')
      setSection('overview')
      setSession({ checked: true, authenticated: false })
    } catch (signOutError) {
      setSession((current) => ({ ...current, error: errorMessage(signOutError) }))
    } finally {
      setSigningOut(false)
    }
  }

  if (!session.checked) {
    return <div className="mx-auto grid min-h-[50vh] max-w-lg place-items-center"><LoaderCircle size={22} className="animate-spin text-[#68675f]" aria-label="Checking admin session" /></div>
  }

  if (!session.authenticated) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-[1440px] flex-col justify-center px-5 py-12 lg:px-10">
        {session.error && <div className="mx-auto mb-4 w-full max-w-lg"><Notice>{session.error}</Notice></div>}
        <AdminLogin configurationMessage={session.configurationMessage} onSignedIn={(email, expiresAt) => setSession({ checked: true, authenticated: true, email, expiresAt })} />
      </div>
    )
  }

  const content = {
    overview: <AdminOverview onNavigate={setSection} />,
    products: <ProductWorkspace />,
    orders: <OrdersWorkspace />,
    customers: <CustomersWorkspace />,
    analytics: <AnalyticsWorkspace />,
    'project-plan': <ProjectKanban />,
  }[section]

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-7 px-5 py-8 lg:flex-row lg:px-10">
      <aside className="w-full shrink-0 lg:w-52">
        <div className="mb-4 flex items-center justify-between gap-3 lg:mb-7">
          <h2 className="text-xs font-medium uppercase tracking-[.16em] text-[#68675f]">Workspace</h2>
          <button type="button" disabled={signingOut} onClick={() => void signOut()} className="flex items-center gap-1.5 text-xs text-[#68675f] hover:text-[#1c1c1a] focus-visible:outline-2 focus-visible:outline-[#1c1c1a] disabled:opacity-60">
            <LogOut size={14} /> {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
        <nav aria-label="Admin workspace" className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-3 lg:flex lg:flex-col">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              aria-current={section === id ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-[#1c1c1a] ${section === id ? 'bg-white font-medium shadow-sm' : 'text-[#68675f] hover:bg-white/60'}`}
            >
              <Icon size={17} aria-hidden="true" /><span>{label}</span>
            </button>
          ))}
        </nav>
        <p className="mt-5 hidden break-all text-[11px] leading-4 text-[#68675f] lg:block">Signed in as {session.email}</p>
      </aside>
      {session.error && <div className="w-full lg:hidden"><Notice>{session.error}</Notice></div>}
      {content}
    </div>
  )
}

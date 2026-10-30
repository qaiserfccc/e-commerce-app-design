'use client'

import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { getMerchandisingProducts, setProductMerchandising, type MerchandisingKind } from '@/app/actions/catalog-admin'
import { DataTable, type DataTableBulkAction, type DataTableColumn } from '@/components/admin/data-table'
import { reportError } from '@/lib/ui/notifications'

type MerchandisingProduct = Awaited<ReturnType<typeof getMerchandisingProducts>>[number]

const labels: Record<MerchandisingKind, { title: string; description: string; selected: (row: MerchandisingProduct) => boolean }> = {
  featured: {
    title: 'Featured products',
    description: 'Choose the products highlighted in the homepage Featured view.',
    selected: (row) => row.isFeatured,
  },
  new_arrival: {
    title: 'New arrivals',
    description: 'Curate which products appear in the homepage New arrivals view.',
    selected: (row) => row.isNewArrival,
  },
  on_sale: {
    title: 'On sale',
    description: 'Choose discounted products for the homepage On sale view. A compare-at price higher than the current price is required.',
    selected: (row) => row.isOnSale,
  },
}

function currentPrice(row: MerchandisingProduct) {
  const value = Number(row.price)
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: row.currency }).format(value)
  } catch {
    return `${row.currency} ${value.toFixed(2)}`
  }
}

export function MerchandisingManager({ kind, canEdit }: { kind: MerchandisingKind; canEdit: boolean }) {
  const config = labels[kind]
  const [products, setProducts] = useState<MerchandisingProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')

  async function load() {
    setLoadError('')
    try {
      setProducts(await getMerchandisingProducts())
    } catch (failure) {
      setLoadError(reportError(failure, 'Products could not be loaded.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function update(ids: string[], selected: boolean) {
    setError('')
    try {
      await setProductMerchandising(ids, kind, selected)
      setProducts((current) => current.map((product) => ids.includes(product.id)
        ? { ...product, [kind === 'featured' ? 'isFeatured' : kind === 'new_arrival' ? 'isNewArrival' : 'isOnSale']: selected }
        : product))
    } catch (failure) {
      const message = reportError(failure, 'Product merchandising could not be updated.')
      setError(message)
      throw failure
    }
  }

  const canBeOnSale = (row: MerchandisingProduct) => Boolean(row.compareAtPrice && Number(row.compareAtPrice) > Number(row.effectivePrice))
  const columns: DataTableColumn<MerchandisingProduct>[] = [
    {
      id: 'selection',
      header: 'Homepage',
      className: 'min-w-[150px]',
      cell: (row) => {
        const checked = config.selected(row)
        const disabled = !canEdit || Boolean(savingId) || (kind === 'on_sale' && !checked && !canBeOnSale(row))
        return <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            aria-label={`${checked ? 'Remove' : 'Add'} ${row.name} ${config.title.toLowerCase()}`}
            onChange={(event) => {
              const next = event.target.checked
              setSavingId(row.id)
              void update([row.id], next).catch(() => undefined).finally(() => setSavingId(''))
            }}
            className="size-4 accent-[#006f9b]"
          />
          {checked ? 'Included' : kind === 'on_sale' && !canBeOnSale(row) ? 'Set sale price' : 'Not included'}
        </label>
      },
    },
    {
      id: 'product',
      header: 'Product',
      searchValue: (row) => `${row.name} ${row.sku ?? ''} ${row.slug}`,
      sortValue: (row) => row.name,
      className: 'min-w-[220px]',
      cell: (row) => <><p className="font-medium text-[#15384d]">{row.name}</p><p className="mt-1 text-xs text-[#526b7b]">{row.sku || row.slug}</p></>,
    },
    {
      id: 'price',
      header: 'Current price',
      sortValue: (row) => Number(row.effectivePrice),
      cell: (row) => currentPrice({ ...row, price: row.effectivePrice }),
    },
    {
      id: 'compare',
      header: 'Compare-at',
      sortValue: (row) => Number(row.compareAtPrice ?? 0),
      cell: (row) => row.compareAtPrice ? currentPrice({ ...row, price: row.compareAtPrice }) : '—',
    },
    {
      id: 'status',
      header: 'Product status',
      sortValue: (row) => row.status,
      cell: (row) => <span className="capitalize">{row.status}</span>,
    },
  ]

  const bulkActions: DataTableBulkAction<MerchandisingProduct>[] = [
    {
      label: `Add selected to ${config.title.toLowerCase()}`,
      disabled: (rows) => rows.length === 0 || rows.every(config.selected),
      run: (rows) => update(rows.map((row) => row.id), true),
    },
    {
      label: `Remove selected from ${config.title.toLowerCase()}`,
      disabled: (rows) => rows.length === 0 || rows.every((row) => !config.selected(row)),
      run: (rows) => update(rows.map((row) => row.id), false),
    },
  ]

  const selectedFilter = (row: MerchandisingProduct) => config.selected(row) ? 'included' : 'not-included'
  const selectedCount = products.filter(config.selected).length

  return (
    <section className="min-w-0 flex-1">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-[-.04em]">{config.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68675f]">{config.description}</p>
      </div>
      {!canEdit && <p role="status" className="mb-4 rounded-lg bg-[#e8f6fb] p-3 text-sm text-[#15384d]">Staff accounts can view merchandising but not change it.</p>}
      {error && <p role="alert" className="mb-4 rounded-lg border border-[#9b4a36]/25 bg-[#f8eeeb] p-3 text-sm text-[#753b2d]">{error}</p>}
      {loadError && <p role="alert" className="mb-4 rounded-lg border border-[#9b4a36]/25 bg-[#f8eeeb] p-3 text-sm text-[#753b2d]">{loadError}</p>}
      {loading ? <div role="status" className="flex items-center gap-2 text-sm text-[#526b7b]"><LoaderCircle size={16} className="animate-spin" />Loading products…</div> : !loadError && (
        <>
          <p className="mb-3 text-sm text-[#526b7b]">{selectedCount} {selectedCount === 1 ? 'product' : 'products'} included</p>
          <DataTable
            rows={products}
            getRowId={(row) => row.id}
            itemLabel="products"
            emptyMessage="No products match this search."
            filters={[
              { id: 'merchandising', label: 'Homepage inclusion', options: [{ label: 'Included', value: 'included' }, { label: 'Not included', value: 'not-included' }], value: selectedFilter },
            ]}
            getSearchValue={(row) => `${row.name} ${row.sku ?? ''} ${row.slug}`}
            canSelectRow={(row) => canEdit && (kind !== 'on_sale' || config.selected(row) || canBeOnSale(row))}
            columns={columns}
            bulkActions={canEdit ? bulkActions : []}
            initialPageSize={15}
          />
        </>
      )}
    </section>
  )
}

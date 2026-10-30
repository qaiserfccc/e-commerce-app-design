'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'

export type DataTableColumn<Row> = {
  id: string
  header: string
  cell: (row: Row) => ReactNode
  searchValue?: (row: Row) => string
  sortValue?: (row: Row) => string | number | null
  className?: string
}

export type DataTableFilter<Row> = {
  id: string
  label: string
  options: Array<{ label: string; value: string }>
  value: (row: Row) => string
}

export type DataTableBulkAction<Row> = {
  label: string
  confirm?: (rows: Row[]) => string
  disabled?: (rows: Row[]) => boolean
  run: (rows: Row[]) => Promise<void> | void
}

type DataTableProps<Row> = {
  rows: Row[]
  columns: DataTableColumn<Row>[]
  getRowId: (row: Row) => string
  getSearchValue?: (row: Row) => string
  canSelectRow?: (row: Row) => boolean
  isRowVisible?: (row: Row, search: string) => boolean
  toolbarContent?: ReactNode
  filters?: DataTableFilter<Row>[]
  bulkActions?: DataTableBulkAction<Row>[]
  exportRow?: (row: Row) => Record<string, string | number | boolean | null>
  initialPageSize?: number
  emptyMessage: string
  itemLabel?: string
  searchable?: boolean
  serverPagination?: { total: number; offset: number; pageSize: number; onOffsetChange: (offset: number) => void }
}

export function DataTable<Row>({
  rows,
  columns,
  getRowId,
  getSearchValue,
  canSelectRow,
  isRowVisible,
  toolbarContent,
  filters = [],
  bulkActions = [],
  exportRow,
  initialPageSize = 10,
  emptyMessage,
  itemLabel = 'items',
  searchable = true,
  serverPagination,
}: DataTableProps<Row>) {
  const [query, setQuery] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [sort, setSort] = useState<{ id: string; direction: 'asc' | 'desc' } | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const selectable = bulkActions.length > 0 || Boolean(exportRow)

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    const result = rows.filter((row) => {
      if (isRowVisible?.(row, needle) === false) return false
      if (needle) {
        const searchable = (getSearchValue?.(row) ?? columns.map((column) => column.searchValue?.(row) ?? '').join(' ')).toLocaleLowerCase()
        if (!searchable.includes(needle)) return false
      }
      return filters.every((filter) => {
        const selected = filterValues[filter.id]
        return !selected || filter.value(row) === selected
      })
    })
    if (sort) {
      const column = columns.find((item) => item.id === sort.id)
      if (column?.sortValue) {
        result.sort((left, right) => {
          const a = column.sortValue!(left)
          const b = column.sortValue!(right)
          const comparison = typeof a === 'number' && typeof b === 'number'
            ? a - b
            : String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true, sensitivity: 'base' })
          return sort.direction === 'asc' ? comparison : -comparison
        })
      }
    }
    return result
  }, [columns, filterValues, filters, getSearchValue, isRowVisible, query, rows, sort])

  const activePageSize = serverPagination?.pageSize ?? pageSize
  const activePage = serverPagination ? Math.floor(serverPagination.offset / serverPagination.pageSize) + 1 : page
  const resultCount = serverPagination?.total ?? filteredRows.length
  const pageCount = Math.max(1, Math.ceil(resultCount / activePageSize))
  const currentPage = Math.min(activePage, pageCount)
  const visibleRows = serverPagination ? filteredRows : filteredRows.slice((currentPage - 1) * activePageSize, currentPage * activePageSize)
  const selectedRows = rows.filter((row) => selectedIds.has(getRowId(row)))
  const selectableRows = visibleRows.filter((row) => canSelectRow?.(row) !== false)
  const allVisibleSelected = selectable && selectableRows.length > 0 && selectableRows.every((row) => selectedIds.has(getRowId(row)))
  const hasActiveControls = Boolean(query.trim() || sort || Object.values(filterValues).some(Boolean))

  function updateQuery(value: string) {
    setQuery(value)
    setPage(1)
  }

  function updateFilter(id: string, value: string) {
    setFilterValues((current) => ({ ...current, [id]: value }))
    setPage(1)
  }

  function toggleRow(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setActionError('')
  }

  function toggleVisibleRows() {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (allVisibleSelected) visibleRows.forEach((row) => next.delete(getRowId(row)))
      else selectableRows.forEach((row) => next.add(getRowId(row)))
      return next
    })
    setActionError('')
  }

  async function runBulkAction(action: DataTableBulkAction<Row>) {
    if (action.confirm && !window.confirm(action.confirm(selectedRows))) return
    setBusy(true)
    setActionError('')
    try {
      await action.run(selectedRows)
      setSelectedIds(new Set())
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The bulk operation could not be completed.')
    } finally {
      setBusy(false)
    }
  }

  function exportSelected() {
    if (!exportRow || selectedRows.length === 0) return
    const records = selectedRows.map(exportRow)
    const headers = [...new Set(records.flatMap((record) => Object.keys(record)))]
    const escape = (value: string | number | boolean | null) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const csv = [headers.map(escape).join(','), ...records.map((record) => headers.map((header) => escape(record[header] ?? '')).join(','))].join('\r\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `isk-${itemLabel.replaceAll(' ', '-')}-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#cfe2eb] bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-[#cfe2eb] bg-[#f7fcff] p-3 sm:p-4" role="toolbar" aria-label="List tools">
        {searchable && <label className="flex min-w-[min(100%,16rem)] flex-1 items-center gap-2 rounded-xl border border-[#b8d4e0] bg-white px-3">
          <Search size={16} className="shrink-0 text-[#526b7b]" aria-hidden="true" />
          <span className="sr-only">Search {itemLabel}</span>
          <input value={query} onChange={(event) => updateQuery(event.target.value)} placeholder={`Search ${itemLabel}…`} className="w-full bg-transparent py-2.5 text-sm text-[#15384d] outline-none placeholder:text-[#526b7b]" />
        </label>}
        {toolbarContent}
        {filters.map((filter) => (
          <label key={filter.id} className="flex items-center gap-2 text-xs font-medium text-[#526b7b]">
            <span className="sr-only">{filter.label}</span>
            <select value={filterValues[filter.id] ?? ''} onChange={(event) => updateFilter(filter.id, event.target.value)} aria-label={filter.label} className="min-h-10 rounded-xl border border-[#b8d4e0] bg-white px-3 text-sm text-[#15384d] focus-visible:outline-2 focus-visible:outline-[#087ba5]">
              <option value="">All {filter.label.toLocaleLowerCase()}</option>
              {filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        ))}
        {hasActiveControls && <button type="button" onClick={() => { setQuery(''); setFilterValues({}); setSort(null); setPage(1) }} className="min-h-9 rounded-full px-3 text-xs font-semibold text-[#526b7b] hover:bg-[#e8f6fb]">Clear filters</button>}
        <span className="ml-auto text-xs text-[#526b7b]">{resultCount} {itemLabel}</span>
        {!serverPagination && <label className="flex items-center gap-2 text-xs text-[#526b7b]">
          <span>Rows</span>
          <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }} aria-label="Rows per page" className="min-h-10 rounded-xl border border-[#b8d4e0] bg-white px-2 text-sm text-[#15384d] focus-visible:outline-2 focus-visible:outline-[#087ba5]">
            {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>}
        {selectable && selectedRows.length > 0 && (
          <div className="flex w-full flex-wrap items-center gap-2 border-t border-[#cfe2eb] pt-3 sm:w-auto sm:border-0 sm:pt-0" aria-live="polite">
            <span className="mr-1 text-sm font-medium text-[#15384d]">{selectedRows.length} selected</span>
            {bulkActions.map((action) => (
              <button key={action.label} type="button" disabled={busy || action.disabled?.(selectedRows)} onClick={() => void runBulkAction(action)} className="min-h-9 rounded-full border border-[#b8d4e0] bg-white px-3 text-xs font-semibold text-[#15384d] transition-colors hover:border-[#087ba5] hover:bg-[#e8f6fb] focus-visible:outline-2 focus-visible:outline-[#087ba5] disabled:opacity-50">
                {busy ? 'Working…' : action.label}
              </button>
            ))}
            {exportRow && <button type="button" disabled={busy} onClick={exportSelected} className="min-h-9 rounded-full border border-[#b8d4e0] bg-white px-3 text-xs font-semibold text-[#15384d] transition-colors hover:border-[#087ba5] hover:bg-[#e8f6fb] disabled:opacity-50">Export selected</button>}
            <button type="button" disabled={busy} onClick={() => setSelectedIds(new Set())} className="min-h-9 rounded-full px-3 text-xs font-semibold text-[#526b7b] hover:bg-[#e8f6fb] disabled:opacity-50">Clear</button>
          </div>
        )}
      </div>

      {actionError && <p role="alert" className="border-b border-[#b4233e]/20 bg-[#fff4f5] px-4 py-3 text-sm text-[#9b1c34]">{actionError}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="bg-[#e8f6fb] text-xs font-semibold uppercase tracking-wide text-[#15384d]">
            <tr>
              {selectable && (
                <th scope="col" className="w-12 px-4 py-3">
                  <input type="checkbox" checked={allVisibleSelected} disabled={selectableRows.length === 0} onChange={toggleVisibleRows} aria-label="Select all selectable rows on this page" className="size-4 accent-[#006f9b] disabled:opacity-40" />
                </th>
              )}
              {columns.map((column) => {
                const isSortable = Boolean(column.sortValue)
                const active = sort?.id === column.id
                return (
                  <th key={column.id} scope="col" aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined} className={`px-4 py-3 ${column.className ?? ''}`}>
                    {isSortable ? (
                      <button type="button" onClick={() => { setSort((current) => current?.id === column.id ? { id: column.id, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { id: column.id, direction: 'asc' }); setPage(1) }} className="inline-flex items-center gap-1.5 rounded focus-visible:outline-2 focus-visible:outline-[#087ba5]">
                        {column.header}
                        {active ? sort.direction === 'asc' ? <ArrowUp size={13} aria-hidden="true" /> : <ArrowDown size={13} aria-hidden="true" /> : <ArrowUpDown size={13} className="opacity-50" aria-hidden="true" />}
                      </button>
                    ) : column.header}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#cfe2eb]">
            {visibleRows.map((row) => (
              <tr key={getRowId(row)} className="transition-colors hover:bg-[#f7fcff]">
                {selectable && (
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedIds.has(getRowId(row))} disabled={canSelectRow?.(row) === false} onChange={() => toggleRow(getRowId(row))} aria-label={`Select row ${getRowId(row)}`} className="size-4 accent-[#006f9b] disabled:opacity-40" />
                  </td>
                )}
                {columns.map((column) => <td key={column.id} className={`px-4 py-3 text-[#15384d] ${column.className ?? ''}`}>{column.cell(row)}</td>)}
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr><td colSpan={columns.length + Number(selectable)} className="px-4 py-12 text-center text-sm text-[#526b7b]">{query || Object.values(filterValues).some(Boolean) ? 'No rows match these filters.' : emptyMessage}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="px-4 pb-4">
        <Pagination
          total={resultCount}
          page={currentPage}
          pageSize={activePageSize}
          onPageChange={serverPagination ? (nextPage) => { setSelectedIds(new Set()); serverPagination.onOffsetChange((nextPage - 1) * serverPagination.pageSize) } : setPage}
          itemLabel={itemLabel}
        />
      </div>
    </div>
  )
}

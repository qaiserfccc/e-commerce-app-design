'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

export type PaginationProps = {
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  itemLabel?: string
  className?: string
}

export function Pagination({ total, page, pageSize, onPageChange, itemLabel = 'items', className = '' }: PaginationProps) {
  const pageCount = Math.ceil(total / pageSize)
  if (pageCount <= 1) return null

  const currentPage = Math.min(Math.max(page, 1), pageCount)
  const firstPage = Math.max(1, Math.min(currentPage - 2, pageCount - 4))
  const lastPage = Math.min(pageCount, firstPage + 4)
  const pages = Array.from({ length: lastPage - firstPage + 1 }, (_, index) => firstPage + index)
  const firstItem = (currentPage - 1) * pageSize + 1
  const lastItem = Math.min(currentPage * pageSize, total)
  const buttonClass = 'inline-flex size-9 items-center justify-center rounded-full text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087ba5] disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <nav aria-label="Pagination" className={`flex flex-wrap items-center justify-between gap-3 border-t border-[#cfe2eb] pt-4 ${className}`}>
      <p className="text-sm text-[#526b7b]" aria-live="polite">
        Showing <span className="font-semibold text-[#15384d]">{firstItem}–{lastItem}</span> of{' '}
        <span className="font-semibold text-[#15384d]">{total}</span> {itemLabel}
      </p>
      <div className="flex items-center gap-1">
        <button type="button" className={`${buttonClass} text-[#15384d] hover:bg-[#e8f6fb]`} onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} aria-label="Go to previous page">
          <ChevronLeft size={17} aria-hidden="true" />
        </button>
        <span className="px-2 text-xs font-medium text-[#526b7b] sm:hidden">Page {currentPage} of {pageCount}</span>
        <div className="hidden items-center gap-1 sm:flex">
          {firstPage > 1 && <>
            <PageButton page={1} currentPage={currentPage} onPageChange={onPageChange} />
            {firstPage > 2 && <span className="px-1 text-sm text-[#526b7b]" aria-hidden="true">…</span>}
          </>}
          {pages.map((pageNumber) => <PageButton key={pageNumber} page={pageNumber} currentPage={currentPage} onPageChange={onPageChange} />)}
          {lastPage < pageCount && <>
            {lastPage < pageCount - 1 && <span className="px-1 text-sm text-[#526b7b]" aria-hidden="true">…</span>}
            <PageButton page={pageCount} currentPage={currentPage} onPageChange={onPageChange} />
          </>}
        </div>
        <button type="button" className={`${buttonClass} text-[#15384d] hover:bg-[#e8f6fb]`} onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === pageCount} aria-label="Go to next page">
          <ChevronRight size={17} aria-hidden="true" />
        </button>
      </div>
    </nav>
  )
}

function PageButton({ page, currentPage, onPageChange }: { page: number; currentPage: number; onPageChange: (page: number) => void }) {
  const active = page === currentPage
  return (
    <button
      type="button"
      className={`inline-flex size-9 items-center justify-center rounded-full text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087ba5] ${active ? 'bg-[#006f9b] text-white' : 'text-[#15384d] hover:bg-[#e8f6fb]'}`}
      onClick={() => onPageChange(page)}
      aria-label={`Go to page ${page}`}
      aria-current={active ? 'page' : undefined}
    >
      {page}
    </button>
  )
}

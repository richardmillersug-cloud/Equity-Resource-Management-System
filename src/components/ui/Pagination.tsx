'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UsePaginationReturn<T> {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  rowsPerPage: number;
  setRowsPerPage: (rows: number) => void;
  totalPages: number;
  paginatedItems: T[];
  startIndex: number;
  endIndex: number;
  totalItems: number;
}

export function usePagination<T>(
  items: T[],
  defaultRowsPerPage = 10
): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

  // Reset to first page whenever the dataset or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [items.length, rowsPerPage]);

  const totalPages =
    rowsPerPage === -1 ? 1 : Math.max(1, Math.ceil(items.length / rowsPerPage));

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex =
    rowsPerPage === -1 ? 0 : (safeCurrentPage - 1) * rowsPerPage;
  const endIndex =
    rowsPerPage === -1
      ? items.length
      : Math.min(safeCurrentPage * rowsPerPage, items.length);

  const paginatedItems =
    rowsPerPage === -1 ? items : items.slice(startIndex, endIndex);

  return {
    currentPage: safeCurrentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    totalPages,
    paginatedItems,
    startIndex,
    endIndex,
    totalItems: items.length,
  };
}

// ---------------------------------------------------------------------------
// UI component
// ---------------------------------------------------------------------------

const DEFAULT_ROWS_OPTIONS = [5, 10, 25, 50, 100];

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  rowsPerPage: number;
  startIndex: number;
  endIndex: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
  rowsOptions?: number[];
  className?: string;
}

export function PaginationBar({
  currentPage,
  totalPages,
  rowsPerPage,
  startIndex,
  endIndex,
  totalItems,
  onPageChange,
  onRowsPerPageChange,
  rowsOptions = DEFAULT_ROWS_OPTIONS,
  className = '',
}: PaginationBarProps) {
  if (totalItems === 0) return null;

  // Build visible page numbers with ellipsis
  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | '...')[] = [1];
    if (currentPage > 3) pages.push('...');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  const btnBase =
    'inline-flex items-center justify-center w-8 h-8 rounded-md text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400';
  const btnEnabled =
    'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 border border-gray-200';
  const btnDisabled = 'text-gray-300 cursor-not-allowed border border-gray-100';
  const btnActive =
    'bg-emerald-600 text-white border border-emerald-600 shadow-sm';

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-slate-50 ${className}`}
    >
      {/* Left: record count info */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span>
          {totalItems === 0
            ? 'No records'
            : rowsPerPage === -1
            ? `All ${totalItems} records`
            : `${startIndex + 1}–${endIndex} of ${totalItems} records`}
        </span>

        {/* Rows-per-page selector */}
        <span className="flex items-center gap-1.5">
          <span className="hidden sm:inline text-slate-400">Show</span>
          <select
            value={rowsPerPage}
            onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
            className="px-2 py-1 border border-gray-200 rounded-md bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {rowsOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
            <option value={-1}>All</option>
          </select>
          <span className="hidden sm:inline text-slate-400">per page</span>
        </span>
      </div>

      {/* Right: page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* First */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className={`${btnBase} ${currentPage === 1 ? btnDisabled : btnEnabled}`}
            title="First page"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>

          {/* Prev */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`${btnBase} ${currentPage === 1 ? btnDisabled : btnEnabled}`}
            title="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Page numbers */}
          {getPageNumbers().map((page, idx) =>
            page === '...' ? (
              <span
                key={`ellipsis-${idx}`}
                className="w-8 text-center text-xs text-slate-400 select-none"
              >
                …
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page as number)}
                className={`${btnBase} ${
                  page === currentPage ? btnActive : btnEnabled
                }`}
              >
                {page}
              </button>
            )
          )}

          {/* Next */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`${btnBase} ${
              currentPage === totalPages ? btnDisabled : btnEnabled
            }`}
            title="Next page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Last */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className={`${btnBase} ${
              currentPage === totalPages ? btnDisabled : btnEnabled
            }`}
            title="Last page"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

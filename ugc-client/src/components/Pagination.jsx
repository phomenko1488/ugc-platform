import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Classic "1 ... 4 5 6 ... 12" truncation. Operates on 1-indexed page numbers purely for
// readability of the math below; the component's own props/callbacks stay 0-indexed
// (matching the backend's PageResponseDTO.pageNumber convention) everywhere else.
function buildPageList(current1, total) {
    const delta = 1;
    const range = [1];
    for (let i = current1 - delta; i <= current1 + delta; i++) {
        if (i > 1 && i < total) range.push(i);
    }
    if (total > 1) range.push(total);

    const withDots = [];
    let last;
    for (const page of range) {
        if (last != null) {
            if (page - last === 2) {
                withDots.push(last + 1);
            } else if (page - last !== 1) {
                withDots.push('...');
            }
        }
        withDots.push(page);
        last = page;
    }
    return withDots;
}

/**
 * Unified pagination footer for every list this platform paginates (Back-Office user/payout/offer
 * tables, Advertiser Traffic Inspector & Billing ledger, Worker submissions & wallet, Partner
 * commission ledger). Talks entirely in 0-indexed page numbers to match PageResponseDTO's
 * pageNumber field — callers should not need to +1/-1 anything.
 *
 * Props:
 *   currentPage      — 0-indexed current page
 *   totalPages
 *   totalElements
 *   pageSize
 *   onPageChange(nextPage: number)
 *   onPageSizeChange(nextSize: number)  — optional; omit to hide the page-size selector entirely
 */
export default function Pagination({
    currentPage,
    totalPages,
    totalElements,
    pageSize,
    onPageChange,
    onPageSizeChange,
}) {
    if (!totalElements) return null;

    const from = currentPage * pageSize + 1;
    const to = Math.min(totalElements, (currentPage + 1) * pageSize);
    const hasPages = totalPages > 1;
    const pageList = hasPages ? buildPageList(currentPage + 1, totalPages) : [];

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-2 text-[11px] text-slate-500">
            <div>
                Показано <span className="text-slate-300 font-semibold">{from}–{to}</span> из{' '}
                <span className="text-slate-300 font-semibold">{totalElements}</span> записей
            </div>

            <div className="flex items-center gap-3">
                {onPageSizeChange && (
                    <div className="flex items-center gap-1.5">
                        <span className="hidden sm:inline">На странице:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => onPageSizeChange(Number(e.target.value))}
                            className="bg-brand-bg border border-brand-border rounded-lg px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-brand-accent"
                        >
                            {PAGE_SIZE_OPTIONS.map((size) => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                    </div>
                )}

                {hasPages && (
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 0}
                            className="p-1.5 rounded-lg border border-brand-border text-slate-400 hover:text-slate-200 hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none"
                            aria-label="Назад"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>

                        <div className="hidden sm:flex items-center gap-1">
                            {pageList.map((entry, idx) =>
                                entry === '...' ? (
                                    <span key={`dots-${idx}`} className="px-1.5 text-slate-600 select-none">…</span>
                                ) : (
                                    <button
                                        key={entry}
                                        type="button"
                                        onClick={() => onPageChange(entry - 1)}
                                        className={`min-w-[1.75rem] px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                                            entry - 1 === currentPage
                                                ? 'bg-brand-accent text-brand-bg shadow-md shadow-brand-accent/20'
                                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-brand-border'
                                        }`}
                                    >
                                        {entry}
                                    </button>
                                )
                            )}
                        </div>

                        <span className="sm:hidden px-2 text-slate-400 font-semibold">
                            {currentPage + 1} / {totalPages}
                        </span>

                        <button
                            type="button"
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages - 1}
                            className="p-1.5 rounded-lg border border-brand-border text-slate-400 hover:text-slate-200 hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none"
                            aria-label="Вперёд"
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

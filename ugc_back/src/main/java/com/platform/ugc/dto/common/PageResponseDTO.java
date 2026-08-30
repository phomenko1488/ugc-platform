package com.platform.ugc.dto.common;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Unified pagination envelope (Pageable & Pagination Controls initiative) — every list endpoint
 * that can grow unbounded (users, payouts, the financial ledger, submissions, offers) now returns
 * this instead of a flat array, so ugc-client's {@code Pagination.jsx} has one consistent shape to
 * render across the Back-Office, Advertiser, Worker and Partner cabinets.
 * <p>
 * A plain record rather than a class wrapping Spring's own {@link Page}: returning {@code Page<T>}
 * straight from a controller serializes with Spring's own field names (e.g. {@code number},
 * {@code first}) which don't line up with the frontend's {@code pageNumber}/{@code isFirst}
 * naming, and pulls in extra fields ({@code pageable}, {@code sort}) the client has no use for.
 */
public record PageResponseDTO<T>(
        List<T> content,
        int pageNumber,
        int pageSize,
        long totalElements,
        int totalPages,
        boolean isFirst,
        boolean isLast,
        boolean hasNext,
        boolean hasPrevious
) {
    public static <T> PageResponseDTO<T> of(Page<T> page) {
        return new PageResponseDTO<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isFirst(),
                page.isLast(),
                page.hasNext(),
                page.hasPrevious()
        );
    }

    /**
     * Pages an already-fully-materialized list in memory. For endpoints whose figures are
     * computed by aggregating in Java (per-offer/per-advertiser rollups across Offer/Submission/
     * FinancialLedgerEntry rows, e.g. the Advertiser campaign-comparison table and the Partner
     * referred-advertisers CRM) rather than a single repository query, pushing the pagination
     * itself into SQL would mean rewriting the whole aggregation as one query — out of scope and
     * higher-risk than slicing the computed result here. The slow part (the aggregation) still
     * runs once; only the response payload shrinks to one page.
     */
    public static <T> PageResponseDTO<T> ofList(List<T> items, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 200);
        int totalElements = items.size();
        int start = Math.min(safePage * safeSize, totalElements);
        int end = Math.min(start + safeSize, totalElements);
        int totalPages = (int) Math.ceil((double) totalElements / safeSize);
        boolean isFirst = safePage == 0;
        boolean isLast = totalPages == 0 || safePage >= totalPages - 1;
        return new PageResponseDTO<>(
                items.subList(start, end),
                safePage,
                safeSize,
                totalElements,
                totalPages,
                isFirst,
                isLast,
                !isLast,
                !isFirst
        );
    }
}

package com.dietetica.lembas.shared.dto;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Stable API response for paginated collections.
 *
 * <p>Controllers should return this DTO instead of exposing Spring Data's
 * {@link org.springframework.data.domain.PageImpl} JSON shape directly. This keeps
 * the HTTP contract under application control across Spring upgrades.</p>
 *
 * @param content       current page items
 * @param totalElements total number of matching records
 * @param totalPages    total number of pages
 * @param number        zero-based current page index
 * @param size          requested page size
 * @param first         whether this is the first page
 * @param last          whether this is the last page
 * @param empty         whether this page has no items
 * @param <T>           item DTO type
 */
public record PageResponse<T>(
        List<T> content,
        long totalElements,
        int totalPages,
        int number,
        int size,
        boolean first,
        boolean last,
        boolean empty
) {
    /** Builds a stable response from a Spring Data page. */
    public static <T> PageResponse<T> from(Page<T> page) {
        return new PageResponse<>(
                page.getContent(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.getNumber(),
                page.getSize(),
                page.isFirst(),
                page.isLast(),
                page.isEmpty()
        );
    }
}

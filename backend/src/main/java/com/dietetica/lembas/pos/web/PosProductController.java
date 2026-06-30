package com.dietetica.lembas.pos.web;

import com.dietetica.lembas.pos.dto.PosProductSearchItemDto;
import com.dietetica.lembas.pos.service.PosProductSearchService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * POS-internal endpoints. Exposed under {@code /api/pos/**} and protected by
 * the standard authenticated rule in {@code SecurityConfig}.
 *
 * <p>This controller is intentionally thin: the search heuristic and stock
 * resolution live in {@link PosProductSearchService}.</p>
 */
@RestController
@RequestMapping("/api/pos/products")
public class PosProductController {

    private final PosProductSearchService searchService;

    public PosProductController(PosProductSearchService searchService) {
        this.searchService = searchService;
    }

    /**
     * Searches products by name or barcode.
     *
     * <p>Inputs that look like a numeric barcode (6+ digits) are routed
     * through an exact match against the indexed barcode column. All other
     * inputs run as a case-insensitive LIKE search over name, brand, barcode
     * and category, limited to {@link PosProductSearchService#MAX_RESULTS}
     * results.</p>
     *
     * @param query    required, 1-100 characters after trim
     * @param branchId optional; when present, available stock is resolved
     *                 for the branch (required to render the out-of-stock
     *                 indicator). When absent, stock is reported as null.
     * @return matching products, possibly empty
     */
    @GetMapping("/search")
    public List<PosProductSearchItemDto> search(
            @RequestParam("q") String query,
            @RequestParam(name = "branchId", required = false) Long branchId
    ) {
        return searchService.search(query, branchId);
    }
}

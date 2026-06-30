package com.dietetica.lembas.pos.service;

import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.inventory.repository.StockLotRepository;
import com.dietetica.lembas.pos.dto.PosProductSearchItemDto;
import com.dietetica.lembas.shared.exception.DomainException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * POS product search use case.
 *
 * <p>Searches the catalog by name or barcode. Inputs that look like a numeric
 * barcode (6+ digits) are routed through an exact, case-insensitive match that
 * can hit the unique {@code idx_products_barcode} index. All other inputs are
 * resolved through the public-store LIKE search, bounded to
 * {@link #MAX_RESULTS} rows and sorted by name for stable output.</p>
 *
 * <p>Per-line available stock is computed against the resolved branch, so the
 * UI can render out-of-stock items as disabled without a second round-trip.</p>
 */
@Service
public class PosProductSearchService {

    /** Hard cap on results to keep the POS responsive on slow networks. */
    static final int MAX_RESULTS = 25;

    /**
     * Heuristic for barcode-shaped input: 6 or more digits, nothing else.
     * Chosen because EAN-8 / EAN-13 / UPC-A are the barcodes the store expects
     * from the scanner, and shorter numeric fragments are usually partial
     * typed names.
     */
    static final Pattern BARCODE_PATTERN = Pattern.compile("\\d{6,}");

    /** Hard cap on the raw query length to avoid abuse and unbounded LIKE scans. */
    static final int MAX_QUERY_LENGTH = 100;

    private final ProductRepository productRepository;
    private final StockLotRepository stockLotRepository;

    public PosProductSearchService(
            ProductRepository productRepository,
            StockLotRepository stockLotRepository
    ) {
        this.productRepository = productRepository;
        this.stockLotRepository = stockLotRepository;
    }

    /**
     * Resolves the search results for a cashier.
     *
     * @param rawQuery the raw user input; may be null/blank
     * @param branchId the branch used to compute available stock; may be null
     *                 when no cash session is open yet (stock will be reported
     *                 as null on every row)
     * @return the matching products, possibly empty; never null
     * @throws DomainException {@code POS_QUERY_REQUIRED} or {@code POS_QUERY_TOO_LONG}
     */
    @Transactional(readOnly = true)
    public List<PosProductSearchItemDto> search(String rawQuery, Long branchId) {
        if (rawQuery == null || rawQuery.isBlank()) {
            throw new DomainException(
                    "POS_QUERY_REQUIRED",
                    HttpStatus.BAD_REQUEST,
                    "Search query is required"
            );
        }
        String query = rawQuery.trim();
        if (query.length() > MAX_QUERY_LENGTH) {
            throw new DomainException(
                    "POS_QUERY_TOO_LONG",
                    HttpStatus.BAD_REQUEST,
                    "Search query must be at most " + MAX_QUERY_LENGTH + " characters"
            );
        }

        if (BARCODE_PATTERN.matcher(query).matches()) {
            return productRepository.findByBarcodeIgnoreCaseAndActiveTrue(query)
                    .map(product -> List.of(toDto(product, branchId)))
                    .orElseGet(List::of);
        }

        String lowered = query.toLowerCase(Locale.ROOT);
        var page = productRepository.searchStoreProducts(
                lowered,
                null,
                PageRequest.of(0, MAX_RESULTS, Sort.by("name").ascending())
        );
        return page.getContent().stream()
                .map(product -> toDto(product, branchId))
                .toList();
    }

    /**
     * Maps a catalog product into the POS DTO and resolves its branch stock.
     */
    private PosProductSearchItemDto toDto(Product product, Long branchId) {
        BigDecimal stock = branchId == null
                ? null
                : stockLotRepository.calculateAvailableQuantity(product.getId(), branchId);
        return new PosProductSearchItemDto(
                product.getId(),
                product.getName(),
                product.getBrandName(),
                product.getBarcode(),
                product.getSalePrice(),
                stock,
                product.getImageUrl()
        );
    }
}

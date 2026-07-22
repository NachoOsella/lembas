package com.dietetica.lembas.pos.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dietetica.lembas.catalog.api.ProductLookup;
import com.dietetica.lembas.catalog.api.ProductSearch;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.inventory.api.InventoryQuery;
import com.dietetica.lembas.pos.dto.PosProductSearchItemDto;
import com.dietetica.lembas.shared.exception.DomainException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/**
 * Unit tests for {@link PosProductSearchService}.
 *
 * <p>Verifies:</p>
 * <ul>
 *   <li>Blank / null queries raise {@code POS_QUERY_REQUIRED}.</li>
 *   <li>Over-long queries raise {@code POS_QUERY_TOO_LONG}.</li>
 *   <li>Numeric inputs (6+ digits) hit the exact barcode match.</li>
 *   <li>Short numeric inputs fall back to the LIKE search.</li>
 *   <li>Text inputs run as a name/barcode LIKE search bounded by MAX_RESULTS.</li>
 *   <li>Stock is resolved from {@code InventoryQuery} when branchId is
 *       present and reported as null when it is absent.</li>
 *   <li>No match returns an empty list (not null).</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class PosProductSearchServiceTest {

    @Mock
    private ProductLookup productLookup;

    @Mock
    private ProductSearch productSearch;

    @Mock
    private InventoryQuery inventoryQuery;

    @InjectMocks
    private PosProductSearchService service;

    // ---------------------------------------------------------------------------
    // Input validation
    // ---------------------------------------------------------------------------

    @Test
    void blankQueryRaisesPosQueryRequired() {
        assertThatThrownBy(() -> service.search("   ", 1L))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("Search query is required")
                .extracting("code")
                .isEqualTo("POS_QUERY_REQUIRED");
    }

    @Test
    void nullQueryRaisesPosQueryRequired() {
        assertThatThrownBy(() -> service.search(null, 1L))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("POS_QUERY_REQUIRED");
    }

    @Test
    void overLongQueryRaisesPosQueryTooLong() {
        String overlong = "a".repeat(PosProductSearchService.MAX_QUERY_LENGTH + 1);
        assertThatThrownBy(() -> service.search(overlong, 1L))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("POS_QUERY_TOO_LONG");
    }

    // ---------------------------------------------------------------------------
    // Barcode heuristic
    // ---------------------------------------------------------------------------

    @Test
    void numericBarcodeHitUsesExactMatch() {
        Product product = product(7L, "Aceite de oliva 500ml", "7501", new BigDecimal("2500.00"));
        when(productLookup.findActiveByBarcode("7501234567890")).thenReturn(Optional.of(product));
        when(inventoryQuery.calculateAvailableQuantity(7L, 2L)).thenReturn(new BigDecimal("12.00"));

        List<PosProductSearchItemDto> result = service.search("7501234567890", 2L);

        assertThat(result).hasSize(1);
        PosProductSearchItemDto item = result.get(0);
        assertThat(item.id()).isEqualTo(7L);
        assertThat(item.name()).isEqualTo("Aceite de oliva 500ml");
        assertThat(item.barcode()).isEqualTo("7501");
        assertThat(item.salePrice()).isEqualByComparingTo("2500.00");
        assertThat(item.availableStock()).isEqualByComparingTo("12.00");

        // The LIKE search must not be called when the barcode hit succeeded.
        verify(productSearch, never()).searchPublished(any(), any(), any());
    }

    @Test
    void exactBarcodeMissReturnsEmptyList() {
        when(productLookup.findActiveByBarcode("9999999999999")).thenReturn(Optional.empty());

        List<PosProductSearchItemDto> result = service.search("9999999999999", 2L);

        assertThat(result).isEmpty();
        verify(inventoryQuery, never()).calculateAvailableQuantity(any(), any());
    }

    @Test
    void shortNumericFallsBackToLikeSearch() {
        // "12345" is 5 digits: heuristic does not match, so it goes to the LIKE search.
        Product product = product(11L, "Yerba 1kg", null, new BigDecimal("1800.00"));
        Page<Product> page = new PageImpl<>(List.of(product));
        when(productSearch.searchPublished(eq("12345"), isNull(), any(Pageable.class)))
                .thenReturn(page);
        when(inventoryQuery.calculateAvailableQuantity(11L, 1L)).thenReturn(new BigDecimal("3.00"));

        List<PosProductSearchItemDto> result = service.search("12345", 1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).name()).isEqualTo("Yerba 1kg");
        verify(productLookup, never()).findActiveByBarcode(any());
    }

    // ---------------------------------------------------------------------------
    // Text search
    // ---------------------------------------------------------------------------

    @Test
    void textSearchLowercasesAndAppliesResultsCap() {
        Product a = product(1L, "Aceite", "7501", new BigDecimal("200.00"));
        Product b = product(2L, "Arroz", null, new BigDecimal("150.00"));
        Page<Product> page = new PageImpl<>(List.of(a, b));
        when(productSearch.searchPublished(eq("ace"), isNull(), any(Pageable.class)))
                .thenReturn(page);
        when(inventoryQuery.calculateAvailableQuantity(1L, 5L)).thenReturn(new BigDecimal("9.00"));
        when(inventoryQuery.calculateAvailableQuantity(2L, 5L)).thenReturn(new BigDecimal("0.00"));

        List<PosProductSearchItemDto> result = service.search("ACE", 5L);

        assertThat(result).extracting(PosProductSearchItemDto::id).containsExactly(1L, 2L);
        assertThat(result.get(0).availableStock()).isEqualByComparingTo("9.00");
        assertThat(result.get(1).availableStock()).isEqualByComparingTo("0.00");

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(productSearch).searchPublished(eq("ace"), isNull(), pageableCaptor.capture());
        Pageable pageable = pageableCaptor.getValue();
        assertThat(pageable.getPageNumber()).isZero();
        assertThat(pageable.getPageSize()).isEqualTo(PosProductSearchService.MAX_RESULTS);
        Sort.Order nameOrder = pageable.getSort().getOrderFor("name");
        assertThat(nameOrder).isNotNull();
        assertThat(nameOrder.getDirection().isAscending()).isTrue();
    }

    @Test
    void textSearchWithNullBranchReturnsNullStockForEachRow() {
        Product a = product(1L, "Aceite", "7501", new BigDecimal("200.00"));
        Page<Product> page = new PageImpl<>(List.of(a));
        when(productSearch.searchPublished(eq("ace"), isNull(), any(Pageable.class)))
                .thenReturn(page);

        List<PosProductSearchItemDto> result = service.search("ace", null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).availableStock()).isNull();
        verify(inventoryQuery, never()).calculateAvailableQuantity(any(), any());
    }

    @Test
    void emptyLikePageReturnsEmptyList() {
        Page<Product> page = new PageImpl<>(List.of());
        when(productSearch.searchPublished(eq("zz"), isNull(), any(Pageable.class)))
                .thenReturn(page);

        List<PosProductSearchItemDto> result = service.search("zz", 1L);

        assertThat(result).isEmpty();
    }

    @Test
    void queryIsTrimmedBeforeSearch() {
        Page<Product> page = new PageImpl<>(List.of());
        when(productSearch.searchPublished(eq("ace"), isNull(), any(Pageable.class)))
                .thenReturn(page);

        service.search("   ace   ", 1L);

        verify(productSearch).searchPublished(eq("ace"), isNull(), any(Pageable.class));
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    private Product product(Long id, String name, String barcode, BigDecimal price) {
        Product p = new Product();
        p.setId(id);
        p.setName(name);
        p.setBarcode(barcode);
        p.setSalePrice(price);
        return p;
    }
}

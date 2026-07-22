package com.dietetica.lembas.inventory.api;

import com.dietetica.lembas.inventory.dto.StockLotDto;
import com.dietetica.lembas.inventory.dto.StockMovementDto;
import com.dietetica.lembas.inventory.dto.StockProductSummaryDto;
import com.dietetica.lembas.inventory.model.StockMovementType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/** Read-only inventory contract for feature boundaries and API adapters. */
public interface InventoryQuery {

    /** Lists aggregated product stock summaries. */
    Page<StockProductSummaryDto> listProductSummaries(
            String search, Long branchId, boolean expiringSoon, Pageable pageable);

    /** Lists stock lots using the administrative filters. */
    Page<StockLotDto> listLots(String search, Long productId, Long branchId, boolean expiringSoon, Pageable pageable);

    /** Lists traceable stock movements using the administrative filters. */
    Page<StockMovementDto> listMovements(
            StockMovementType type,
            Long productId,
            Long branchId,
            String search,
            LocalDate from,
            LocalDate to,
            Pageable pageable);

    /** Calculates available stock from active lots. */
    BigDecimal calculateAvailableQuantity(Long productId, Long branchId);

    /** Calculates availability for multiple products with one branch-scoped query. */
    Map<Long, BigDecimal> calculateAvailableQuantityByProductIds(Collection<Long> productIds, Long branchId);
}

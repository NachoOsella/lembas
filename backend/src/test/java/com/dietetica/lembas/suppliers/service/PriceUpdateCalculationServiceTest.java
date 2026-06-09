package com.dietetica.lembas.suppliers.service;

import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.suppliers.model.PriceUpdateBatch;
import com.dietetica.lembas.suppliers.model.PriceUpdateBatchItem;
import com.dietetica.lembas.suppliers.model.PriceUpdateBatchItemStatus;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class PriceUpdateCalculationServiceTest {
    private final PriceUpdateCalculationService service = new PriceUpdateCalculationService();

    @Test
    void shouldCalculateExistingProductPreviewWithTransferPercentage() {
        PriceUpdateBatch batch = batch(BigDecimal.valueOf(35), BigDecimal.valueOf(50), BigDecimal.valueOf(100));
        PriceUpdateBatchItem item = new PriceUpdateBatchItem();
        item.setProduct(new Product());
        item.setOldCost(BigDecimal.valueOf(5200));
        item.setNewCost(BigDecimal.valueOf(5800));
        item.setOldSalePrice(BigDecimal.valueOf(8000));

        service.calculate(batch, item, false);

        assertThat(item.getStatus()).isEqualTo(PriceUpdateBatchItemStatus.UPDATE);
        assertThat(item.getSupplierVariationPercentage()).isEqualByComparingTo("11.538");
        assertThat(item.getSuggestedSalePrice()).isEqualByComparingTo("8300.00");
        assertThat(item.getFinalSalePrice()).isEqualByComparingTo("8300.00");
    }

    @Test
    void shouldCalculateNewProductPreviewWithMarginAndRounding() {
        PriceUpdateBatch batch = batch(BigDecimal.valueOf(35), BigDecimal.valueOf(100), BigDecimal.valueOf(100));
        PriceUpdateBatchItem item = new PriceUpdateBatchItem();
        item.setNewCost(BigDecimal.valueOf(4000));

        service.calculate(batch, item, false);

        assertThat(item.getStatus()).isEqualTo(PriceUpdateBatchItemStatus.CREATE);
        assertThat(item.getSuggestedSalePrice()).isEqualByComparingTo("6200.00");
        assertThat(item.getFinalSalePrice()).isEqualByComparingTo("6200.00");
    }

    @Test
    void shouldMarkMissingCostAsError() {
        PriceUpdateBatch batch = batch(BigDecimal.valueOf(35), BigDecimal.valueOf(100), BigDecimal.valueOf(100));
        PriceUpdateBatchItem item = new PriceUpdateBatchItem();

        service.calculate(batch, item, false);

        assertThat(item.getStatus()).isEqualTo(PriceUpdateBatchItemStatus.ERROR);
        assertThat(item.getErrorMessage()).contains("cost");
    }

    /** Builds batch defaults for calculation tests. */
    private PriceUpdateBatch batch(BigDecimal margin, BigDecimal transfer, BigDecimal rounding) {
        PriceUpdateBatch batch = new PriceUpdateBatch();
        batch.setDefaultNewProductMarginPercentage(margin);
        batch.setDefaultTransferPercentage(transfer);
        batch.setDefaultRoundingMultiple(rounding);
        return batch;
    }
}

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
    void shouldCalculateExistingProductPreviewWithMarginAndVariation() {
        PriceUpdateBatch batch = batch(BigDecimal.valueOf(35));
        PriceUpdateBatchItem item = new PriceUpdateBatchItem();
        item.setProduct(new Product());
        item.setOldCost(BigDecimal.valueOf(5200));
        item.setNewCost(BigDecimal.valueOf(5800));
        item.setOldSalePrice(BigDecimal.valueOf(8000));

        service.calculate(batch, item, false);

        assertThat(item.getStatus()).isEqualTo(PriceUpdateBatchItemStatus.UPDATE);
        assertThat(item.getSupplierVariationPercentage()).isEqualByComparingTo("11.538");
        assertThat(item.getSuggestedSalePrice()).isEqualByComparingTo("8923.08");
        assertThat(item.getFinalSalePrice()).isEqualByComparingTo("8923.08");
    }

    @Test
    void shouldCalculateNewProductPreviewWithMargin() {
        PriceUpdateBatch batch = batch(BigDecimal.valueOf(35));
        PriceUpdateBatchItem item = new PriceUpdateBatchItem();
        item.setNewCost(BigDecimal.valueOf(4000));

        service.calculate(batch, item, false);

        assertThat(item.getStatus()).isEqualTo(PriceUpdateBatchItemStatus.CREATE);
        assertThat(item.getSuggestedSalePrice()).isEqualByComparingTo("6153.85");
        assertThat(item.getFinalSalePrice()).isEqualByComparingTo("6153.85");
    }

    @Test
    void shouldMarkMissingCostAsError() {
        PriceUpdateBatch batch = batch(BigDecimal.valueOf(35));
        PriceUpdateBatchItem item = new PriceUpdateBatchItem();

        service.calculate(batch, item, false);

        assertThat(item.getStatus()).isEqualTo(PriceUpdateBatchItemStatus.ERROR);
        assertThat(item.getErrorMessage()).contains("cost");
    }

    @Test
    void shouldCalculateExistingProductFromMargin() {
        PriceUpdateBatch batch = batch(BigDecimal.valueOf(35));
        PriceUpdateBatchItem item = new PriceUpdateBatchItem();
        item.setProduct(new Product());
        item.setOldCost(BigDecimal.valueOf(2200));
        item.setNewCost(BigDecimal.valueOf(9999));
        item.setOldSalePrice(BigDecimal.valueOf(3100));
        item.setNewProductMarginPercentage(BigDecimal.valueOf(35));

        service.calculate(batch, item, false);

        assertThat(item.getSuggestedSalePrice()).isEqualByComparingTo("15383.08");
        assertThat(item.getFinalSalePrice()).isEqualByComparingTo("15383.08");
    }

    @Test
    void shouldReverseCalculateMarginFromFinalPriceForExistingProduct() {
        PriceUpdateBatch batch = batch(BigDecimal.valueOf(35));
        PriceUpdateBatchItem item = new PriceUpdateBatchItem();
        item.setProduct(new Product());
        item.setNewCost(BigDecimal.valueOf(4000));
        item.setFinalSalePrice(BigDecimal.valueOf(6200));

        service.calculateReverseFromPrice(batch, item);

        assertThat(item.getNewProductMarginPercentage()).isEqualByComparingTo("35.4839");
    }

    @Test
    void shouldReverseCalculateMarginFromFinalPriceForNewProduct() {
        PriceUpdateBatch batch = batch(BigDecimal.valueOf(35));
        PriceUpdateBatchItem item = new PriceUpdateBatchItem();
        item.setNewCost(BigDecimal.valueOf(4000));
        item.setFinalSalePrice(BigDecimal.valueOf(6200));

        service.calculateReverseFromPrice(batch, item);

        assertThat(item.getNewProductMarginPercentage()).isEqualByComparingTo("35.4839");
    }

    @Test
    void shouldClampReverseMarginToZeroWhenPriceIsLowerThanCost() {
        PriceUpdateBatch batch = batch(BigDecimal.valueOf(35));
        PriceUpdateBatchItem item = new PriceUpdateBatchItem();
        item.setNewCost(BigDecimal.valueOf(5000));
        item.setFinalSalePrice(BigDecimal.valueOf(4000));

        service.calculateReverseFromPrice(batch, item);

        assertThat(item.getNewProductMarginPercentage()).isEqualByComparingTo("0");
    }

    @Test
    void shouldSkipReverseCalculationWhenFinalPriceIsNull() {
        PriceUpdateBatchItem item = new PriceUpdateBatchItem();
        item.setNewCost(BigDecimal.valueOf(4000));

        service.calculateReverseFromPrice(new PriceUpdateBatch(), item);

        assertThat(item.getNewProductMarginPercentage()).isNull();
    }

    @Test
    void shouldMarkNegativeCostAsErrorForExistingProduct() {
        PriceUpdateBatch batch = batch(BigDecimal.valueOf(35));
        PriceUpdateBatchItem item = new PriceUpdateBatchItem();
        item.setProduct(new Product());
        item.setOldCost(BigDecimal.valueOf(1000));
        item.setOldSalePrice(BigDecimal.valueOf(2000));
        item.setNewCost(BigDecimal.valueOf(-100));

        service.calculate(batch, item, false);

        assertThat(item.getStatus()).isEqualTo(PriceUpdateBatchItemStatus.ERROR);
        assertThat(item.getErrorMessage()).contains("positive");
    }

    @Test
    void shouldMarkNegativeCostAsErrorForNewProduct() {
        PriceUpdateBatch batch = batch(BigDecimal.valueOf(35));
        PriceUpdateBatchItem item = new PriceUpdateBatchItem();
        item.setNewCost(BigDecimal.valueOf(-100));

        service.calculate(batch, item, false);

        assertThat(item.getStatus()).isEqualTo(PriceUpdateBatchItemStatus.ERROR);
        assertThat(item.getErrorMessage()).contains("positive");
    }

    @Test
    void shouldCalculateSmallCostProductCorrectly() {
        PriceUpdateBatch batch = batch(BigDecimal.valueOf(35));
        PriceUpdateBatchItem item = new PriceUpdateBatchItem();
        item.setNewCost(BigDecimal.valueOf(10));

        service.calculate(batch, item, false);

        assertThat(item.getSuggestedSalePrice()).isEqualByComparingTo("15.38");
        assertThat(item.getFinalSalePrice()).isEqualByComparingTo("15.38");
    }

    /** Builds batch defaults for calculation tests. */
    private PriceUpdateBatch batch(BigDecimal margin) {
        PriceUpdateBatch batch = new PriceUpdateBatch();
        batch.setDefaultNewProductMarginPercentage(margin);
        return batch;
    }
}

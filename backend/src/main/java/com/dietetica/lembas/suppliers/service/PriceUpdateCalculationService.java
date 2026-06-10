package com.dietetica.lembas.suppliers.service;

import com.dietetica.lembas.suppliers.model.PriceUpdateBatch;
import com.dietetica.lembas.suppliers.model.PriceUpdateBatchItem;
import com.dietetica.lembas.suppliers.model.PriceUpdateBatchItemStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Calculates suggested and final sale prices for price update preview rows. */
@Service
public class PriceUpdateCalculationService {
    private static final BigDecimal ONE_HUNDRED = BigDecimal.valueOf(100);
    private static final BigDecimal DEFAULT_MARGIN = BigDecimal.valueOf(35);

    /** Applies batch defaults and recalculates the row preview from cost and margin. */
    public void calculate(PriceUpdateBatch batch, PriceUpdateBatchItem item, boolean preserveFinalOverride) {
        if (item.getStatus() == PriceUpdateBatchItemStatus.ERROR || item.getStatus() == PriceUpdateBatchItemStatus.EXCLUDED) {
            return;
        }
        if (item.getNewCost() == null) {
            item.setStatus(PriceUpdateBatchItemStatus.ERROR);
            item.setErrorMessage("New supplier cost is required");
            return;
        }
        if (item.getNewCost().compareTo(BigDecimal.ZERO) <= 0) {
            item.setStatus(PriceUpdateBatchItemStatus.ERROR);
            item.setErrorMessage("New supplier cost must be positive");
            return;
        }
        if (item.getProduct() != null) {
            calculateSupplierVariation(item);
        }
        calculateFromMargin(batch, item, preserveFinalOverride);
    }

    /** Replaces row override fields with the batch defaults, then recalculates the row. */
    public void applyDefaults(PriceUpdateBatch batch, PriceUpdateBatchItem item) {
        item.setNewProductMarginPercentage(defaultMargin(batch));
        item.setApplyCostUpdate(batch.isApplyCostUpdatesByDefault());
        item.setApplySalePriceUpdate(batch.isApplySalePriceUpdatesByDefault());
        if (item.getStatus() == PriceUpdateBatchItemStatus.UNCHANGED && batch.isExcludeUnchangedByDefault()) {
            item.setStatus(PriceUpdateBatchItemStatus.EXCLUDED);
            return;
        }
        calculate(batch, item, false);
    }

    /** Derives margin from a manually entered final sale price. */
    public void calculateReverseFromPrice(PriceUpdateBatch batch, PriceUpdateBatchItem item) {
        if (item.getStatus() == PriceUpdateBatchItemStatus.ERROR
                || item.getStatus() == PriceUpdateBatchItemStatus.EXCLUDED
                || item.getFinalSalePrice() == null) {
            return;
        }
        calculateReverseMargin(item);
    }

    /** Calculates sale price from replacement cost and target margin for both new and existing products. */
    private void calculateFromMargin(PriceUpdateBatch batch, PriceUpdateBatchItem item, boolean preserveFinalOverride) {
        BigDecimal margin = item.getNewProductMarginPercentage() == null ? defaultMargin(batch) : item.getNewProductMarginPercentage();
        item.setNewProductMarginPercentage(margin);
        if (margin.compareTo(BigDecimal.ZERO) < 0 || margin.compareTo(ONE_HUNDRED) >= 0) {
            item.setStatus(PriceUpdateBatchItemStatus.ERROR);
            item.setErrorMessage("New product margin must be between 0 and 99.99");
            return;
        }
        BigDecimal suggested = calculatePriceFromMargin(item.getNewCost(), margin);
        item.setSuggestedSalePrice(suggested);
        if (!preserveFinalOverride || item.getFinalSalePrice() == null) {
            item.setFinalSalePrice(suggested);
        }
        if (item.getProduct() == null) {
            item.setStatus(PriceUpdateBatchItemStatus.CREATE);
        } else if (item.getStatus() != PriceUpdateBatchItemStatus.REVIEW) {
            item.setStatus(item.getNewCost().compareTo(item.getOldCost()) == 0 ? PriceUpdateBatchItemStatus.UNCHANGED : PriceUpdateBatchItemStatus.UPDATE);
        }
    }

    /** Calculates supplier cost variation for display only. */
    private void calculateSupplierVariation(PriceUpdateBatchItem item) {
        BigDecimal oldCost = item.getOldCost();
        BigDecimal newCost = item.getNewCost();
        if (oldCost == null) {
            item.setStatus(PriceUpdateBatchItemStatus.REVIEW);
            item.setErrorMessage("Existing product is missing current cost or sale price");
            return;
        }
        if (oldCost.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal variation = newCost.subtract(oldCost)
                    .multiply(ONE_HUNDRED)
                    .divide(oldCost, 3, RoundingMode.HALF_UP);
            item.setSupplierVariationPercentage(variation);
        }
    }

    /** Derives margin from the final sale price and replacement cost. */
    private void calculateReverseMargin(PriceUpdateBatchItem item) {
        BigDecimal cost = item.getNewCost();
        BigDecimal price = item.getFinalSalePrice();
        if (cost == null || price == null || price.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        BigDecimal margin = BigDecimal.ONE.subtract(cost.divide(price, 6, RoundingMode.HALF_UP)).multiply(ONE_HUNDRED);
        if (margin.compareTo(BigDecimal.ZERO) < 0) {
            margin = BigDecimal.ZERO;
        }
        if (margin.compareTo(ONE_HUNDRED) >= 0) {
            return;
        }
        item.setNewProductMarginPercentage(margin);
    }

    /** Calculates sale price from replacement cost and target margin. price = cost / (1 - margin%). */
    private BigDecimal calculatePriceFromMargin(BigDecimal cost, BigDecimal margin) {
        BigDecimal denominator = BigDecimal.ONE.subtract(margin.divide(ONE_HUNDRED, 6, RoundingMode.HALF_UP));
        return cost.divide(denominator, 2, RoundingMode.HALF_UP);
    }

    /** Returns the batch default margin or the MVP fallback. */
    private BigDecimal defaultMargin(PriceUpdateBatch batch) {
        return batch.getDefaultNewProductMarginPercentage() == null ? DEFAULT_MARGIN : batch.getDefaultNewProductMarginPercentage();
    }
}

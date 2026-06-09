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
    private static final BigDecimal DEFAULT_TRANSFER = BigDecimal.valueOf(100);
    private static final BigDecimal DEFAULT_ROUNDING = BigDecimal.valueOf(100);

    /** Applies batch defaults and recalculates the row preview. */
    public void calculate(PriceUpdateBatch batch, PriceUpdateBatchItem item, boolean preserveFinalOverride) {
        if (item.getStatus() == PriceUpdateBatchItemStatus.ERROR || item.getStatus() == PriceUpdateBatchItemStatus.EXCLUDED) {
            return;
        }
        if (item.getNewCost() == null) {
            item.setStatus(PriceUpdateBatchItemStatus.ERROR);
            item.setErrorMessage("New supplier cost is required");
            return;
        }
        if (item.getProduct() == null && item.getStatus() != PriceUpdateBatchItemStatus.REVIEW) {
            calculateNewProduct(batch, item, preserveFinalOverride);
        } else if (item.getProduct() != null) {
            calculateExistingProduct(batch, item, preserveFinalOverride);
        }
    }

    /** Replaces row override fields with the batch defaults, then recalculates the row. */
    public void applyDefaults(PriceUpdateBatch batch, PriceUpdateBatchItem item) {
        item.setTransferPercentage(defaultTransfer(batch));
        item.setNewProductMarginPercentage(defaultMargin(batch));
        item.setApplyCostUpdate(batch.isApplyCostUpdatesByDefault());
        item.setApplySalePriceUpdate(batch.isApplySalePriceUpdatesByDefault());
        if (item.getStatus() == PriceUpdateBatchItemStatus.UNCHANGED && batch.isExcludeUnchangedByDefault()) {
            item.setStatus(PriceUpdateBatchItemStatus.EXCLUDED);
            return;
        }
        calculate(batch, item, false);
    }

    /** Rounds a positive price to the nearest configured multiple using HALF_UP semantics. */
    public BigDecimal roundPrice(BigDecimal value, BigDecimal multiple) {
        if (value == null) {
            return null;
        }
        BigDecimal normalizedMultiple = multiple == null || multiple.compareTo(BigDecimal.ZERO) <= 0 ? DEFAULT_ROUNDING : multiple;
        return value.divide(normalizedMultiple, 0, RoundingMode.HALF_UP).multiply(normalizedMultiple).setScale(2, RoundingMode.HALF_UP);
    }

    /** Calculates sale price for an existing product from supplier cost variation. */
    private void calculateExistingProduct(PriceUpdateBatch batch, PriceUpdateBatchItem item, boolean preserveFinalOverride) {
        BigDecimal oldCost = item.getOldCost();
        BigDecimal newCost = item.getNewCost();
        BigDecimal oldSalePrice = item.getOldSalePrice();
        if (oldCost == null || oldSalePrice == null) {
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
        BigDecimal transfer = item.getTransferPercentage() == null ? defaultTransfer(batch) : item.getTransferPercentage();
        item.setTransferPercentage(transfer);
        BigDecimal transferredDelta = newCost.subtract(oldCost)
                .multiply(transfer)
                .divide(ONE_HUNDRED, 2, RoundingMode.HALF_UP);
        BigDecimal suggested = roundPrice(oldSalePrice.add(transferredDelta).max(BigDecimal.ZERO), defaultRounding(batch));
        item.setSuggestedSalePrice(suggested);
        if (!preserveFinalOverride || item.getFinalSalePrice() == null) {
            item.setFinalSalePrice(suggested);
        }
        if (item.getStatus() != PriceUpdateBatchItemStatus.REVIEW) {
            item.setStatus(newCost.compareTo(oldCost) == 0 ? PriceUpdateBatchItemStatus.UNCHANGED : PriceUpdateBatchItemStatus.UPDATE);
        }
    }

    /** Calculates initial sale price for a new product from replacement cost and margin. */
    private void calculateNewProduct(PriceUpdateBatch batch, PriceUpdateBatchItem item, boolean preserveFinalOverride) {
        BigDecimal margin = item.getNewProductMarginPercentage() == null ? defaultMargin(batch) : item.getNewProductMarginPercentage();
        item.setNewProductMarginPercentage(margin);
        if (margin.compareTo(ONE_HUNDRED) >= 0) {
            item.setStatus(PriceUpdateBatchItemStatus.ERROR);
            item.setErrorMessage("New product margin must be lower than 100");
            return;
        }
        BigDecimal denominator = BigDecimal.ONE.subtract(margin.divide(ONE_HUNDRED, 6, RoundingMode.HALF_UP));
        BigDecimal suggested = roundPrice(item.getNewCost().divide(denominator, 2, RoundingMode.HALF_UP), defaultRounding(batch));
        item.setSuggestedSalePrice(suggested);
        if (!preserveFinalOverride || item.getFinalSalePrice() == null) {
            item.setFinalSalePrice(suggested);
        }
        item.setStatus(PriceUpdateBatchItemStatus.CREATE);
    }

    /** Returns the batch default margin or the MVP fallback. */
    private BigDecimal defaultMargin(PriceUpdateBatch batch) {
        return batch.getDefaultNewProductMarginPercentage() == null ? DEFAULT_MARGIN : batch.getDefaultNewProductMarginPercentage();
    }

    /** Returns the batch default transfer percentage or the MVP fallback. */
    private BigDecimal defaultTransfer(PriceUpdateBatch batch) {
        return batch.getDefaultTransferPercentage() == null ? DEFAULT_TRANSFER : batch.getDefaultTransferPercentage();
    }

    /** Returns the batch default rounding multiple or the MVP fallback. */
    private BigDecimal defaultRounding(PriceUpdateBatch batch) {
        return batch.getDefaultRoundingMultiple() == null ? DEFAULT_ROUNDING : batch.getDefaultRoundingMultiple();
    }
}

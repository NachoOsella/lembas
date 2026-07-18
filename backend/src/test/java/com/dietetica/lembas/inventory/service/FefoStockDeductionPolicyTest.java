package com.dietetica.lembas.inventory.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.dietetica.lembas.inventory.dto.DeductionPlan;
import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.inventory.model.StockLotStatus;
import com.dietetica.lembas.shared.exception.DomainException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Pure unit tests for FEFO deduction policy without any Spring dependencies. */
class FefoStockDeductionPolicyTest {

    private FefoStockDeductionPolicy policy;

    @BeforeEach
    void setUp() {
        policy = new FefoStockDeductionPolicy();
    }

    @Test
    void shouldDeductFromSingleLot() {
        List<StockLot> lots = List.of(lot(1L, "10.000", null));

        DeductionPlan plan = policy.plan(lots, BigDecimal.valueOf(4));

        assertThat(plan.entries()).hasSize(1);
        assertThat(plan.entries().get(0).stockLotId()).isEqualTo(1L);
        assertThat(plan.entries().get(0).quantityToDeduct()).isEqualByComparingTo("4");
        assertThat(plan.entries().get(0).lotAvailableBefore()).isEqualByComparingTo("10");
        assertThat(plan.entries().get(0).lotAvailableAfter()).isEqualByComparingTo("6");
        assertThat(plan.totalRequested()).isEqualByComparingTo("4");
        assertThat(plan.totalAvailable()).isEqualByComparingTo("10");
        assertThat(plan.fullySatisfied()).isTrue();
    }

    @Test
    void shouldDeductFromMultipleLotsInFefoOrder() {
        StockLot early = lot(1L, "5.000", LocalDate.now().plusDays(5));
        StockLot later = lot(2L, "3.000", LocalDate.now().plusDays(30));
        List<StockLot> lots = List.of(early, later);

        DeductionPlan plan = policy.plan(lots, BigDecimal.valueOf(7));

        assertThat(plan.entries()).hasSize(2);
        assertThat(plan.entries().get(0).stockLotId()).isEqualTo(1L);
        assertThat(plan.entries().get(0).quantityToDeduct()).isEqualByComparingTo("5");
        assertThat(plan.entries().get(0).lotAvailableAfter()).isEqualByComparingTo("0");
        assertThat(plan.entries().get(1).stockLotId()).isEqualTo(2L);
        assertThat(plan.entries().get(1).quantityToDeduct()).isEqualByComparingTo("2");
        assertThat(plan.entries().get(1).lotAvailableAfter()).isEqualByComparingTo("1");
    }

    @Test
    void shouldConsumeNullExpirationLast() {
        StockLot dated = lot(1L, "3.000", LocalDate.now().plusDays(10));
        StockLot noDate = lot(2L, "5.000", null);
        // The repo already orders null expiration last, so we feed them in that order.
        List<StockLot> lots = List.of(dated, noDate);

        DeductionPlan plan = policy.plan(lots, BigDecimal.valueOf(4));

        assertThat(plan.entries()).hasSize(2);
        assertThat(plan.entries().get(0).stockLotId()).isEqualTo(1L);
        assertThat(plan.entries().get(0).quantityToDeduct()).isEqualByComparingTo("3");
        assertThat(plan.entries().get(1).stockLotId()).isEqualTo(2L);
        assertThat(plan.entries().get(1).quantityToDeduct()).isEqualByComparingTo("1");
    }

    @Test
    void shouldThrowWhenStockIsInsufficient() {
        List<StockLot> lots = List.of(lot(1L, "3.000", null));

        assertThatThrownBy(() -> policy.plan(lots, BigDecimal.valueOf(5)))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INSUFFICIENT_STOCK");
    }

    @Test
    void shouldDeductExactAmountThatDepletesLot() {
        List<StockLot> lots = List.of(lot(1L, "5.000", null));

        DeductionPlan plan = policy.plan(lots, BigDecimal.valueOf(5));

        assertThat(plan.entries()).hasSize(1);
        assertThat(plan.entries().get(0).lotAvailableAfter()).isEqualByComparingTo("0");
        assertThat(plan.totalRequested()).isEqualByComparingTo("5");
        assertThat(plan.totalAvailable()).isEqualByComparingTo("5");
    }

    @Test
    void shouldThrowWhenRequestedIsZero() {
        List<StockLot> lots = List.of(lot(1L, "10.000", null));

        assertThatThrownBy(() -> policy.plan(lots, BigDecimal.ZERO))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_DEDUCTION_QUANTITY");
    }

    @Test
    void shouldThrowWhenRequestedIsNegative() {
        List<StockLot> lots = List.of(lot(1L, "10.000", null));

        assertThatThrownBy(() -> policy.plan(lots, BigDecimal.valueOf(-3)))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_DEDUCTION_QUANTITY");
    }

    @Test
    void shouldThrowWhenRequestedQuantityIsNull() {
        assertThatThrownBy(() -> policy.plan(List.of(lot(1L, "10.000", null)), null))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_DEDUCTION_QUANTITY");
    }

    @Test
    void shouldThrowOnEmptyLotList() {
        assertThatThrownBy(() -> policy.plan(List.of(), BigDecimal.valueOf(5)))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INSUFFICIENT_STOCK");
    }

    @Test
    void shouldSkipLotsWithZeroQuantity() {
        StockLot empty = lot(1L, "0.000", null);
        StockLot full = lot(2L, "7.000", LocalDate.now().plusDays(5));
        List<StockLot> lots = List.of(empty, full);

        DeductionPlan plan = policy.plan(lots, BigDecimal.valueOf(3));

        assertThat(plan.entries()).hasSize(1);
        assertThat(plan.entries().get(0).stockLotId()).isEqualTo(2L);
        assertThat(plan.entries().get(0).quantityToDeduct()).isEqualByComparingTo("3");
    }

    @Test
    void shouldPreserveRepositoryProvidedOrderForLotsWithEqualExpirationDates() {
        LocalDate sameExpirationDate = LocalDate.of(2026, 7, 1);
        StockLot firstByRepositoryTieBreaker = lot(10L, "2.000", sameExpirationDate);
        StockLot secondByRepositoryTieBreaker = lot(11L, "2.000", sameExpirationDate);

        DeductionPlan plan =
                policy.plan(List.of(firstByRepositoryTieBreaker, secondByRepositoryTieBreaker), BigDecimal.valueOf(3));

        assertThat(plan.entries())
                .extracting(DeductionPlan.DeductionEntry::stockLotId)
                .containsExactly(10L, 11L);
        assertThat(plan.entries())
                .extracting(DeductionPlan.DeductionEntry::quantityToDeduct)
                .usingComparatorForType(BigDecimal::compareTo, BigDecimal.class)
                .containsExactly(BigDecimal.valueOf(2), BigDecimal.ONE);
    }

    @Test
    void shouldReportCorrectAvailableAfterForMultipleLots() {
        StockLot a = lot(1L, "4.000", LocalDate.now().plusDays(1));
        StockLot b = lot(2L, "6.000", LocalDate.now().plusDays(10));
        List<StockLot> lots = List.of(a, b);

        DeductionPlan plan = policy.plan(lots, BigDecimal.valueOf(7));

        assertThat(plan.totalRequested()).isEqualByComparingTo("7");
        assertThat(plan.totalAvailable()).isEqualByComparingTo("10");
        // Lot A: 4 - 4 = 0
        assertThat(plan.entries().get(0).lotAvailableBefore()).isEqualByComparingTo("4");
        assertThat(plan.entries().get(0).lotAvailableAfter()).isEqualByComparingTo("0");
        // Lot B: 6 - (7-4) = 3
        assertThat(plan.entries().get(1).lotAvailableBefore()).isEqualByComparingTo("6");
        assertThat(plan.entries().get(1).lotAvailableAfter()).isEqualByComparingTo("3");
    }

    /** Creates a stock lot with the minimum fields required by the policy. */
    private StockLot lot(Long id, String quantityAvailable, LocalDate expirationDate) {
        StockLot lot = new StockLot();
        lot.setId(id);
        lot.setQuantityAvailable(new BigDecimal(quantityAvailable));
        lot.setExpirationDate(expirationDate);
        lot.setStatus(StockLotStatus.ACTIVE);
        return lot;
    }
}

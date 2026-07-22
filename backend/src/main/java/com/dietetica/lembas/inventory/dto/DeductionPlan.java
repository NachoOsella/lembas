package com.dietetica.lembas.inventory.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Result of planning a FEFO stock deduction for one product in one branch.
 *
 * <p>The plan lists which lots to deduct from, in FEFO order, and by how much. The stock command
 * boundary applies the plan inside a single transaction with pessimistic locking.</p>
 *
 * @param entries        ordered list of lot-level deductions
 * @param totalRequested quantity that was requested (must be &gt; 0)
 * @param totalAvailable total available stock before deduction
 * @param fullySatisfied true when {@code totalRequested <= totalAvailable}
 */
public record DeductionPlan(
        List<DeductionEntry> entries, BigDecimal totalRequested, BigDecimal totalAvailable, boolean fullySatisfied) {

    /**
     * One lot-level deduction inside a FEFO plan.
     *
     * @param stockLotId        the lot to deduct from
     * @param quantityToDeduct  positive amount to subtract
     * @param lotAvailableBefore quantity available before this deduction
     * @param lotAvailableAfter  resulting quantity after deduction (may be 0)
     */
    public record DeductionEntry(
            Long stockLotId,
            BigDecimal quantityToDeduct,
            BigDecimal lotAvailableBefore,
            BigDecimal lotAvailableAfter) {}
}

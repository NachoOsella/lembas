import { describe, expect, it } from 'vitest';

import type { CashMovementFormModel } from './cash-forms';
import {
  isCashCloseFormValid,
  isCashMovementFormValid,
  isOpeningCashAmountValid,
  toCashCloseRequest,
  toCashMovementRequest,
  toOpenCashSessionRequest,
} from './cash-forms';

const validMovement: CashMovementFormModel = {
  type: 'CASH_IN',
  method: 'CASH',
  amount: '100',
  reason: 'Cambio para caja',
};

describe('cash form policies', () => {
  it('accepts zero and rejects missing or negative opening amounts', () => {
    expect(isOpeningCashAmountValid('0')).toBe(true);
    expect(isOpeningCashAmountValid('')).toBe(false);
    expect(isOpeningCashAmountValid('-1')).toBe(false);
  });

  it('preserves the open request contract and branch rules', () => {
    expect(
      toOpenCashSessionRequest(
        { openingCashAmount: '1250', openingNotes: '  Fondo inicial  ' },
        4,
        true,
      ),
    ).toEqual({ openingCashAmount: '1250.00', openingNotes: 'Fondo inicial', branchId: 4 });
    expect(
      toOpenCashSessionRequest({ openingCashAmount: '1250', openingNotes: '' }, 4, false),
    ).toEqual({ openingCashAmount: '1250.00', openingNotes: null, branchId: null });
  });

  it('requires type, method, non-zero amount, and reason for movements', () => {
    expect(isCashMovementFormValid(validMovement)).toBe(true);
    expect(isCashMovementFormValid({ ...validMovement, amount: '0' })).toBe(false);
    expect(isCashMovementFormValid({ ...validMovement, reason: '  ' })).toBe(false);
    expect(toCashMovementRequest(validMovement)).toEqual({
      type: 'CASH_IN',
      method: 'CASH',
      amount: '100.00',
      reason: 'Cambio para caja',
    });
  });

  it('requires a reason only when the close has a discrepancy', () => {
    const balanced = {
      countedCashAmount: '100',
      cashDifferenceReason: '',
      closingNotes: '',
    };
    const unbalanced = { ...balanced, countedCashAmount: '90' };
    expect(isCashCloseFormValid(balanced, 100)).toBe(true);
    expect(isCashCloseFormValid(unbalanced, 100)).toBe(false);
    expect(
      toCashCloseRequest({ ...unbalanced, cashDifferenceReason: 'Faltante de conteo' }, 100),
    ).toEqual({
      countedCashAmount: '90.00',
      closingNotes: null,
      cashDifferenceReason: 'Faltante de conteo',
    });
  });
});

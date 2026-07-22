import { describe, expect, it } from 'vitest';

import type { CashEntryDto, CashSessionDto } from './cash-session';
import {
  calculateExpectedCash,
  calculateManualCashEffect,
  calculatePhysicalCash,
  cashDifferenceLabel,
} from './cash-presentation';

function entry(overrides: Partial<CashEntryDto> = {}): CashEntryDto {
  return {
    kind: 'MANUAL',
    id: 1,
    type: 'CASH_IN',
    method: 'CASH',
    direction: 'IN',
    amount: '100.00',
    description: 'test',
    registeredBy: 'tester',
    occurredAt: '2026-06-29T08:00:00Z',
    ...overrides,
  };
}

describe('cash presentation policies', () => {
  it('calculates expected and physical cash using CASH entries only', () => {
    const entries = [
      entry({ amount: '50.00' }),
      entry({ id: 2, method: 'QR', amount: '500.00' }),
      entry({ id: 3, direction: 'OUT', amount: '20.00' }),
    ];
    const session: CashSessionDto = {
      id: 1,
      status: 'OPEN',
      branchId: 1,
      branchName: 'Centro',
      openedByUserId: 1,
      openedByUserName: 'Operator',
      openingCashAmount: '100.00',
    };

    expect(calculateExpectedCash('100.00', entries)).toBe(130);
    expect(calculatePhysicalCash(session, entries)).toBe(130);
  });

  it('keeps non-cash manual activity out of the physical movement summary', () => {
    const entries = [
      entry({ amount: '50.00' }),
      entry({ id: 2, method: 'TRANSFER', amount: '900.00' }),
      entry({ id: 3, direction: 'OUT', amount: '10.00' }),
    ];
    expect(calculateManualCashEffect(entries)).toBe(40);
  });

  it('labels the documented difference sign', () => {
    expect(cashDifferenceLabel(0)).toBe('Cuadra exacto');
    expect(cashDifferenceLabel(1)).toBe('Sobrante');
    expect(cashDifferenceLabel(-1)).toBe('Faltante');
  });
});

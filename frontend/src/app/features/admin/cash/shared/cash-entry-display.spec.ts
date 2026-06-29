import { describe, it, expect } from 'vitest';

import {
  cashEntryAmountModifier,
  cashEntryKindLabel,
  cashEntryKindTone,
  cashEntryLabel,
  cashEntryMethodLabel,
  cashEntrySign,
  cashEntryTypeTone,
  CASH_ENTRY_COLUMNS,
} from './cash-entry-display';
import { CashEntryDto } from '../../../../shared/models/cash-session';

/** Builds a minimal entry for testing pure helper functions. */
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

describe('cash-entry-display', () => {
  it('CASH_ENTRY_COLUMNS exposes the unified MANUAL + PAYMENT column set', () => {
    expect(CASH_ENTRY_COLUMNS.map((c) => c.field)).toEqual([
      'kind',
      'type',
      'method',
      'amount',
      'description',
      'registeredBy',
      'occurredAt',
    ]);
  });

  it('cashEntryLabel returns Pago for payments and localized type for manual entries', () => {
    expect(cashEntryLabel(entry({ kind: 'PAYMENT' }))).toBe('Pago');
    expect(cashEntryLabel(entry({ type: 'CASH_IN' }))).toBe('Ingreso');
    expect(cashEntryLabel(entry({ type: 'CASH_OUT' }))).toBe('Egreso');
    expect(cashEntryLabel(entry({ type: 'ADJUSTMENT' }))).toBe('Ajuste');
  });

  it('cashEntryKindLabel returns Caja for payments, Manual otherwise', () => {
    expect(cashEntryKindLabel('PAYMENT')).toBe('Caja');
    expect(cashEntryKindLabel('MANUAL')).toBe('Manual');
  });

  it('cashEntryKindTone maps to severity-pill palette', () => {
    expect(cashEntryKindTone('PAYMENT')).toBe('warn');
    expect(cashEntryKindTone('MANUAL')).toBe('success');
  });

  it('cashEntryTypeTone collapses PAYMENT to neutral and discriminates manual types', () => {
    expect(cashEntryTypeTone(entry({ kind: 'PAYMENT' }))).toBe('neutral');
    expect(cashEntryTypeTone(entry({ type: 'CASH_IN' }))).toBe('success');
    expect(cashEntryTypeTone(entry({ type: 'CASH_OUT' }))).toBe('danger');
    expect(cashEntryTypeTone(entry({ type: 'ADJUSTMENT' }))).toBe('warn');
  });

  it('cashEntrySign encodes the direction at a glance', () => {
    expect(cashEntrySign('IN')).toBe('+');
    expect(cashEntrySign('OUT')).toBe('-');
    expect(cashEntrySign('NEUTRAL')).toBe('±');
  });

  it('cashEntryAmountModifier returns the CSS modifier segment', () => {
    expect(cashEntryAmountModifier('IN')).toBe('in');
    expect(cashEntryAmountModifier('OUT')).toBe('out');
    expect(cashEntryAmountModifier('NEUTRAL')).toBe('adjust');
  });

  it('cashEntryMethodLabel localizes the known method codes and falls back gracefully', () => {
    expect(cashEntryMethodLabel('CASH')).toBe('Efectivo');
    expect(cashEntryMethodLabel('TRANSFER')).toBe('Transferencia');
    expect(cashEntryMethodLabel('QR')).toBe('QR');
    expect(cashEntryMethodLabel('DEBIT_CARD')).toBe('Tarjeta de débito');
    expect(cashEntryMethodLabel('CREDIT_CARD')).toBe('Tarjeta de crédito');
    expect(cashEntryMethodLabel('CHECKOUT_PRO')).toBe('Mercado Pago');
    expect(cashEntryMethodLabel('OTHER')).toBe('Otro');
    expect(cashEntryMethodLabel('CUSTOM_METHOD')).toBe('CUSTOM_METHOD');
    expect(cashEntryMethodLabel(null)).toBe('—');
  });
});

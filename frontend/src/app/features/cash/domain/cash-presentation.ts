import type { CashEntryDto, CashSessionDto } from './cash-session';

/** Explicit state used by cash pages when rendering asynchronous reads. */
export type CashViewState = 'loading' | 'error' | 'empty' | 'data';

/** Resolves the common cash-page read state without coupling it to Angular. */
export function cashViewState(
  loading: boolean,
  errorMessage: string | null,
  hasData: boolean,
): CashViewState {
  if (loading) {
    return 'loading';
  }
  if (errorMessage) {
    return 'error';
  }
  return hasData ? 'data' : 'empty';
}

/** Returns the signed physical-cash effect of one unified cash entry. */
export function cashEntryPhysicalEffect(entry: CashEntryDto): number {
  if (entry.method !== 'CASH') {
    return 0;
  }

  const amount = Number(entry.amount);
  if (!Number.isFinite(amount)) {
    return 0;
  }
  if (entry.direction === 'IN') {
    return Math.abs(amount);
  }
  if (entry.direction === 'OUT') {
    return -Math.abs(amount);
  }
  return amount;
}

/** Calculates expected physical cash from the session timeline. */
export function calculateExpectedCash(
  openingCashAmount: string | null | undefined,
  entries: readonly CashEntryDto[],
): number {
  const opening = Number(openingCashAmount ?? 0);
  return roundCurrency(
    opening + entries.reduce((total, entry) => total + cashEntryPhysicalEffect(entry), 0),
  );
}

/** Calculates the current physical cash balance, never including non-cash entries. */
export function calculatePhysicalCash(
  session: CashSessionDto | null,
  entries: readonly CashEntryDto[],
): number {
  return calculateExpectedCash(session?.openingCashAmount, entries);
}

/** Calculates the net effect of manual physical-cash movements only. */
export function calculateManualCashEffect(entries: readonly CashEntryDto[]): number {
  return roundCurrency(
    entries
      .filter((entry) => entry.kind === 'MANUAL')
      .reduce((total, entry) => total + cashEntryPhysicalEffect(entry), 0),
  );
}

/** Calculates the total amount for one payment method without affecting cash rules. */
export function totalByMethod(
  totals: Record<string, string> | null | undefined,
  method: string,
): number {
  return Number(totals?.[method] ?? 0);
}

/** Returns the close discrepancy using the documented counted-minus-expected formula. */
export function calculateCashDifference(counted: number | null, expected: number): number {
  return counted === null ? 0 : roundCurrency(counted - expected);
}

/** Formats ARS consistently in cash summaries. */
export function formatCashAmount(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Formats an informational signed ARS amount. */
export function formatSignedCashAmount(value: number): string {
  if (value === 0) {
    return formatCashAmount(0);
  }
  return `${value > 0 ? '+' : '−'} ${formatCashAmount(Math.abs(value))}`;
}

/** Returns the human-readable discrepancy category. */
export function cashDifferenceLabel(difference: number): string {
  if (difference === 0) {
    return 'Cuadra exacto';
  }
  return difference > 0 ? 'Sobrante' : 'Faltante';
}

/** Returns explanatory copy for the discrepancy category. */
export function cashDifferenceDescription(difference: number, reasonRequired: boolean): string {
  if (difference === 0) {
    return 'El efectivo contado coincide con el esperado';
  }
  if (reasonRequired) {
    return 'Indica el motivo del sobrante o faltante';
  }
  return difference > 0 ? 'Hay mas efectivo del esperado' : 'Hay menos efectivo del esperado';
}

/** Rounds a monetary calculation to two decimal places. */
export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

import type {
  CashEntryDto,
  CashEntryDirection,
  CashEntryKind,
} from '@features/cash/domain/cash-session';
import type { SeverityPillTone } from '@shared/components/severity-pill/severity-pill';
import type { ColumnDef } from '@shared/components/app-data-table/app-data-table';

/** Cash entry pill tones follow the severity-pill palette. */
export type CashEntryTone = SeverityPillTone;

/** Default table columns for the unified MANUAL + PAYMENT entries list. */
export const CASH_ENTRY_COLUMNS: ColumnDef[] = [
  { field: 'kind', header: 'Origen' },
  { field: 'type', header: 'Tipo' },
  { field: 'method', header: 'Metodo' },
  { field: 'amount', header: 'Monto' },
  { field: 'description', header: 'Detalle' },
  { field: 'registeredBy', header: 'Registrado por' },
  { field: 'occurredAt', header: 'Fecha' },
];

/**
 * Localized label for an entry's type or kind.
 *
 * <p>PAYMENT entries collapse to "Pago" regardless of the underlying method;
 * MANUAL entries use the type to discriminate Ingreso / Egreso / Ajuste.</p>
 */
export function cashEntryLabel(entry: CashEntryDto): string {
  if (entry.kind === 'PAYMENT') {
    return 'Pago';
  }
  switch (entry.type) {
    case 'CASH_IN':
      return 'Ingreso';
    case 'CASH_OUT':
      return 'Egreso';
    case 'ADJUSTMENT':
      return 'Ajuste';
    default:
      return entry.type;
  }
}

/** Pill label for the entry origin (manual movement vs session payment). */
export function cashEntryKindLabel(kind: CashEntryKind): string {
  return kind === 'PAYMENT' ? 'Caja' : 'Manual';
}

/** Severity tone for the entry origin pill. */
export function cashEntryKindTone(kind: CashEntryKind): CashEntryTone {
  return kind === 'PAYMENT' ? 'warn' : 'success';
}

/** Severity tone for the entry type pill. */
export function cashEntryTypeTone(entry: CashEntryDto): CashEntryTone {
  if (entry.kind === 'PAYMENT') {
    return 'neutral';
  }
  switch (entry.type) {
    case 'CASH_IN':
      return 'success';
    case 'CASH_OUT':
      return 'danger';
    case 'ADJUSTMENT':
      return 'warn';
    default:
      return 'neutral';
  }
}

/** Sign prefix displayed in the amount cell so the direction reads at a glance. */
export function cashEntrySign(direction: CashEntryDirection): string {
  if (direction === 'IN') {
    return '+';
  }
  if (direction === 'OUT') {
    return '-';
  }
  return '±';
}

/** CSS modifier class for the amount cell tone (green / red / amber). */
export function cashEntryAmountModifier(direction: CashEntryDirection): string {
  if (direction === 'IN') {
    return 'in';
  }
  if (direction === 'OUT') {
    return 'out';
  }
  return 'adjust';
}

/** Localized label for the payment method code in the entry row. */
export function cashEntryMethodLabel(method: string | null): string {
  if (!method) {
    return '—';
  }
  switch (method) {
    case 'CASH':
      return 'Efectivo';
    case 'TRANSFER':
      return 'Transferencia';
    case 'OTHER':
      return 'Otro';
    case 'QR':
      return 'QR';
    case 'DEBIT_CARD':
      return 'Tarjeta de débito';
    case 'CREDIT_CARD':
      return 'Tarjeta de crédito';
    case 'CHECKOUT_PRO':
      return 'Mercado Pago';
    default:
      return method;
  }
}

/**
 * Cash session DTOs matching the backend {@code CashSessionDto} /
 * {@code OpenCashSessionRequest} defined in the cash module.
 */

/** Cash session lifecycle status. */
export type CashSessionStatus = 'OPEN' | 'CLOSED';

/** Cash movement direction. */
export type CashMovementType = 'CASH_IN' | 'CASH_OUT' | 'ADJUSTMENT';

/** Cash movement payment method. */
export type CashMovementMethod = 'CASH' | 'TRANSFER' | 'OTHER';

/**
 * Origin of a {@link CashEntryDto}.
 *
 * - {@code MANUAL} entries come from {@code cash_movements} (operator-registered).
 * - {@code PAYMENT} entries come from {@code payments} (APPROVED POS sales
 *   settled in cash that physically affect the drawer).
 */
export type CashEntryKind = 'MANUAL' | 'PAYMENT';

/** Cash flow direction of a {@link CashEntryDto}. */
export type CashEntryDirection = 'IN' | 'OUT' | 'NEUTRAL';

/**
 * Unified entry in a cash session's timeline.
 *
 * <p>Replaces the previous {@code movements} shape on the FE; the backend now
 * surfaces both manual movements and APPROVED cash payments as a single
 * chronologically-sorted list.</p>
 */
export interface CashEntryDto {
  kind: CashEntryKind;
  id: number;
  type: string;
  method: string | null;
  direction: CashEntryDirection;
  amount: string;
  description: string;
  registeredBy: string | null;
  occurredAt: string | null;
  /** Optional link to the underlying record (order id for {@code PAYMENT} entries). */
  referenceId?: number | null;
}

/**
 * Informational totals grouped by payment method, returned alongside a
 * closed session (S3-US08). Keys are the {@code name()} of the source enum
 * (e.g. {@code CASH}, {@code QR}, {@code TRANSFER}); values are BigDecimal
 * serialized as strings, with two decimals and HALF_UP rounding.
 */
export interface CashTotalsByMethod {
  paymentsByMethod: Record<string, string>;
  movementsByMethod: Record<string, string>;
}

/** Cash session returned by the open, current and detail endpoints. */
export interface CashSessionDto {
  id: number;
  status: CashSessionStatus;
  branchId: number;
  branchName: string;
  openedByUserId: number | null;
  openedByUserName: string | null;
  openingCashAmount: string;
  openingNotes?: string | null;
  openedAt?: string | null;
  expectedCashAmount?: string | null;
  countedCashAmount?: string | null;
  cashDifferenceAmount?: string | null;
  cashDifferenceReason?: string | null;
  closedByUserId?: number | null;
  closedByUserName?: string | null;
  closedAt?: string | null;
  closingNotes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  /** Unified timeline of manual movements + APPROVED CASH payments. */
  entries?: CashEntryDto[] | null;
  /**
   * Totals-by-method breakdown for the close report. Populated by the close
   * endpoint and by {@code getById} for closed sessions.
   */
  totalsByMethod?: CashTotalsByMethod | null;
}

/** Manual cash movement DTO matching the backend {@code CashMovementDto}. */
export interface CashMovementDto {
  id: number;
  cashSessionId: number;
  type: CashMovementType;
  method: CashMovementMethod;
  amount: string;
  reason: string;
  createdByUserId: number | null;
  createdByUserName: string | null;
  createdAt: string | null;
}

/** Request payload for POST /api/admin/cash-sessions/{id}/movements. */
export interface CreateCashMovementRequest {
  type: CashMovementType;
  method: CashMovementMethod;
  amount: string;
  reason: string;
}

/** Request payload for POST /api/admin/cash-sessions/open. */
export interface OpenCashSessionRequest {
  openingCashAmount: string;
  openingNotes?: string | null;
  /** Required for ADMIN; ignored for MANAGER/EMPLOYEE (derived from the user). */
  branchId?: number | null;
}

/** Request payload for POST /api/admin/cash-sessions/{id}/close. */
export interface CashCloseRequestPayload {
  countedCashAmount: string;
  closingNotes?: string | null;
  /**
   * Required by the backend when the difference between counted and expected
   * cash is non-zero. The FE validates this client-side first; the backend
   * re-validates as the source of truth.
   */
  cashDifferenceReason?: string | null;
}

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
  /** Manual movements, only populated in the detail response. */
  movements?: CashMovementDto[] | null;
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

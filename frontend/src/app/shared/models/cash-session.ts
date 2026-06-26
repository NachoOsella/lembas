/**
 * Cash session DTOs matching the backend {@code CashSessionDto} /
 * {@code OpenCashSessionRequest} defined in the cash module.
 */

/** Cash session lifecycle status. */
export type CashSessionStatus = 'OPEN' | 'CLOSED';

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
}

/** Request payload for POST /api/admin/cash-sessions/open. */
export interface OpenCashSessionRequest {
  openingCashAmount: string;
  openingNotes?: string | null;
  /** Required for ADMIN; ignored for MANAGER/EMPLOYEE (derived from the user). */
  branchId?: number | null;
}

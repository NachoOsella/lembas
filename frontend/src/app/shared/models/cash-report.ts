/**
 * DTOs matching the backend {@code com.dietetica.lembas.reports.dto.CashReportDto}
 * and the related list endpoint {@code CashSessionHistoryDto} (S4-US05).
 *
 * <p>Numeric values are serialized as strings (BigDecimal) following the
 * existing cash module convention; consumers should use the AR currency pipe
 * when rendering.</p>
 */

import {
  CashEntryDto,
  CashMovementDto,
  CashSessionStatus,
  CashTotalsByMethod,
} from './cash-session';

/** Aggregate cash dashboard for a date range. Amounts are kept raw for client-side formatting. */
export interface CashOverviewDto {
  readonly from: string;
  readonly to: string;
  readonly branchId: number | null;
  readonly branchName: string | null;
  readonly generatedAt: string;
  readonly closedSessions: number;
  readonly openSessions: number;
  readonly balancedSessions: number;
  readonly sessionsWithDifference: number;
  readonly expectedCashTotal: number;
  readonly countedCashTotal: number;
  readonly netDifferenceTotal: number;
  readonly absoluteDifferenceTotal: number;
  readonly dailyCloseSeries: ReadonlyArray<CashOverviewDailyDto>;
  readonly paymentMethods: ReadonlyArray<CashMethodTotalDto>;
  readonly sessionsWithDiscrepancy: ReadonlyArray<CashSessionSummaryDto>;
}

/** One day in the cash close trend. */
export interface CashOverviewDailyDto {
  readonly date: string;
  readonly closedSessions: number;
  readonly expectedCash: number;
  readonly countedCash: number;
  readonly difference: number;
}

/** Payment-method total for the selected cash-session period. */
export interface CashMethodTotalDto {
  readonly method: string;
  readonly amount: number;
  readonly transactionCount: number;
}

/** Lightweight projection of a cash session for the history list. */
export interface CashSessionSummaryDto {
  id: number;
  branchId: number;
  branchName: string;
  openedByUserName: string;
  closedByUserName: string | null;
  openedAt: string;
  closedAt: string | null;
  openingCashAmount: string;
  expectedCashAmount: string | null;
  countedCashAmount: string | null;
  cashDifferenceAmount: string | null;
  cashDifferenceReason: string | null;
  status: CashSessionStatus;
  totalPayments: number;
  totalManualMovements: number;
}

/** Paginated wrapper for the cash session history endpoint. */
export interface CashSessionHistoryDto {
  sessions: CashSessionSummaryDto[];
  totalCount: number;
  page: number;
  size: number;
}

/** Full close-of-cash report for a single session. */
export interface CashReportDto {
  sessionId: number;
  branchId: number;
  branchName: string;
  openedByUserId: number | null;
  openedByUserName: string | null;
  closedByUserId: number | null;
  closedByUserName: string | null;
  openedAt: string;
  closedAt: string | null;
  status: CashSessionStatus;
  openingCashAmount: string;
  expectedCashAmount: string | null;
  countedCashAmount: string | null;
  cashDifferenceAmount: string | null;
  cashDifferenceReason: string | null;
  openingNotes: string | null;
  closingNotes: string | null;
  totalsByMethod: CashTotalsByMethod;
  totalTransactions: number;
  posOrdersCount: number;
  totalPosRevenue: string;
  entries: CashEntryDto[];
  manualMovements: CashMovementDto[];
  generatedAt: string;
}

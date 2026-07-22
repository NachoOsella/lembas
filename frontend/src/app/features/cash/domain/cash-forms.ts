import type {
  CashCloseRequestPayload,
  CashMovementMethod,
  CashMovementType,
  CreateCashMovementRequest,
  OpenCashSessionRequest,
} from './cash-session';

/** Typed model used by the cash-opening signal form. */
export interface CashOpenFormModel {
  readonly openingCashAmount: string;
  readonly openingNotes: string;
}

/** Typed model used by the manual-movement signal form. */
export interface CashMovementFormModel {
  readonly type: CashMovementType | '';
  readonly method: CashMovementMethod | '';
  readonly amount: string;
  readonly reason: string;
}

/** Typed model used by the cash-close signal form. */
export interface CashCloseFormModel {
  readonly countedCashAmount: string;
  readonly cashDifferenceReason: string;
  readonly closingNotes: string;
}

/** Parses the normalized monetary text kept by the signal forms. */
export function parseCashAmount(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

/** Returns whether an opening amount is a valid non-negative monetary value. */
export function isOpeningCashAmountValid(value: string): boolean {
  const amount = parseCashAmount(value);
  return amount !== null && amount >= 0;
}

/** Builds the existing open-session API request from typed form values. */
export function toOpenCashSessionRequest(
  value: CashOpenFormModel,
  branchId: number,
  isAdmin: boolean,
): OpenCashSessionRequest | null {
  const amount = parseCashAmount(value.openingCashAmount);
  if (amount === null || amount < 0) {
    return null;
  }

  return {
    openingCashAmount: amount.toFixed(2),
    openingNotes: value.openingNotes.trim() || null,
    branchId: isAdmin ? branchId : null,
  };
}

/** Returns whether a manual movement has all required business inputs. */
export function isCashMovementFormValid(value: CashMovementFormModel): boolean {
  const amount = parseCashAmount(value.amount);
  return (
    value.type !== '' &&
    value.method !== '' &&
    amount !== null &&
    amount !== 0 &&
    value.reason.trim().length > 0
  );
}

/** Builds the existing movement API request from typed form values. */
export function toCashMovementRequest(
  value: CashMovementFormModel,
): CreateCashMovementRequest | null {
  const amount = parseCashAmount(value.amount);
  if (
    !isCashMovementFormValid(value) ||
    value.type === '' ||
    value.method === '' ||
    amount === null
  ) {
    return null;
  }

  return {
    type: value.type,
    method: value.method,
    amount: amount.toFixed(2),
    reason: value.reason.trim(),
  };
}

/** Returns whether the counted amount is a valid non-negative value. */
export function isCountedCashAmountValid(value: string): boolean {
  const amount = parseCashAmount(value);
  return amount !== null && amount >= 0;
}

/** Returns whether a close form has the required discrepancy justification. */
export function isCashCloseFormValid(
  value: CashCloseFormModel,
  expectedCashAmount: number,
): boolean {
  const counted = parseCashAmount(value.countedCashAmount);
  if (counted === null || counted < 0) {
    return false;
  }

  const difference = roundCurrency(counted - expectedCashAmount);
  return difference === 0 || value.cashDifferenceReason.trim().length > 0;
}

/** Builds the existing close-session API request from typed form values. */
export function toCashCloseRequest(
  value: CashCloseFormModel,
  expectedCashAmount: number,
): CashCloseRequestPayload | null {
  if (!isCashCloseFormValid(value, expectedCashAmount)) {
    return null;
  }

  const counted = parseCashAmount(value.countedCashAmount);
  if (counted === null) {
    return null;
  }

  const difference = roundCurrency(counted - expectedCashAmount);
  return {
    countedCashAmount: counted.toFixed(2),
    closingNotes: value.closingNotes.trim() || null,
    cashDifferenceReason: difference === 0 ? null : value.cashDifferenceReason.trim(),
  };
}

/** Rounds a monetary calculation to the backend's two-decimal convention. */
export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface ReportDateRange {
  readonly from: Date;
  readonly to: Date;
}

/** Converts a local calendar date to the API's ISO date-only filter value. */
export function toReportIsoDate(date: Date | null): string | null {
  if (!date) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Returns the current calendar month range. */
export function currentMonthRange(now = new Date()): ReportDateRange {
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: new Date(now),
  };
}

/** Returns an inclusive trailing calendar-day range. */
export function trailingDaysRange(days: number, now = new Date()): ReportDateRange {
  const to = new Date(now);
  const from = new Date(now);
  from.setDate(from.getDate() - (days - 1));
  return { from, to };
}

/** Parses a positive numeric route parameter without accepting partial values. */
export function parseReportId(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

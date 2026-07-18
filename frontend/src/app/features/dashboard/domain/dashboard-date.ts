/**
 * Converts a dashboard date to a local ISO date without UTC timezone shifts.
 */
export function formatDashboardDate(date: Date): string {
  if (!Number.isFinite(date.getTime())) {
    return todayDashboardIso();
  }
  return formatValidDate(date);
}

/**
 * Parses the dashboard's yyyy-MM-dd date value as a local date for the picker.
 * Invalid values fall back to today so the page remains usable.
 */
export function parseDashboardDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date();
  }

  const [year, month, day] = value.split('-').map(Number);
  if (!isValidDateParts(year, month, day)) {
    return new Date();
  }

  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
    ? parsed
    : new Date();
}

/** Returns today's local date in the dashboard API format. */
export function todayDashboardIso(): string {
  return formatValidDate(new Date());
}

function formatValidDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= 31
  );
}

import { describe, expect, it } from 'vitest';

import {
  EMPTY_ADMIN_ORDER_FILTERS,
  DEFAULT_ADMIN_ORDER_TABLE,
  formatDateParam,
  normalizeSearch,
  toAdminOrdersQuery,
} from './order-query';

describe('admin order query policies', () => {
  it('normalizes empty filters and builds a first-page request', () => {
    expect(toAdminOrdersQuery(EMPTY_ADMIN_ORDER_FILTERS, DEFAULT_ADMIN_ORDER_TABLE)).toEqual({
      status: undefined,
      type: undefined,
      branchId: undefined,
      from: undefined,
      to: undefined,
      search: undefined,
      page: 0,
      size: 10,
      sort: undefined,
    });
  });

  it('formats dates and trims search values for the API', () => {
    expect(formatDateParam(new Date(2026, 5, 12))).toBe('2026-06-12');
    expect(normalizeSearch('  ON-001  ')).toBe('ON-001');
    expect(normalizeSearch('   ')).toBeUndefined();
  });
});

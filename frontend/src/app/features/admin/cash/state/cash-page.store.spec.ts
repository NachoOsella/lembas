import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { ErrorMappingService } from '@core/services/error-mapping';
import { CashService } from '@features/cash/data-access/cash';
import type { CashSessionDto } from '@features/cash/domain/cash-session';
import { CashDetailPageStore } from './cash-detail-page.store';

function session(id: number, status: 'OPEN' | 'CLOSED' = 'OPEN'): CashSessionDto {
  return {
    id,
    status,
    branchId: 1,
    branchName: 'Centro',
    openedByUserId: 1,
    openedByUserName: 'Operator',
    openingCashAmount: '100.00',
    entries: [],
  };
}

describe('CashDetailPageStore', () => {
  it('keeps the latest session read when an older source emits late', () => {
    const first = new Subject<CashSessionDto>();
    const second = new Subject<CashSessionDto>();
    const cashService = {
      getById: vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second),
    };

    TestBed.configureTestingModule({
      providers: [
        CashDetailPageStore,
        { provide: CashService, useValue: cashService },
        {
          provide: ErrorMappingService,
          useValue: {
            getMessage: vi.fn((code: string, fallback?: string) => fallback ?? code),
            formatValidationErrors: vi.fn(() => 'validation error'),
          },
        },
      ],
    });
    const store = TestBed.inject(CashDetailPageStore);

    store.load(1);
    store.load(2);
    first.next(session(1));
    second.next(session(2));

    expect(store.session()?.id).toBe(2);
    expect(store.loading()).toBe(false);
    expect(store.viewState()).toBe('data');
  });

  it('exposes an error and recovers through retry', () => {
    const cashService = {
      getById: vi
        .fn()
        .mockReturnValueOnce(throwError(() => new Error('network')))
        .mockReturnValueOnce(of(session(3))),
    };

    TestBed.configureTestingModule({
      providers: [
        CashDetailPageStore,
        { provide: CashService, useValue: cashService },
        {
          provide: ErrorMappingService,
          useValue: {
            getMessage: vi.fn((code: string, fallback?: string) => fallback ?? code),
            formatValidationErrors: vi.fn(() => 'validation error'),
          },
        },
      ],
    });
    const store = TestBed.inject(CashDetailPageStore);

    store.load(3);
    expect(store.viewState()).toBe('error');
    expect(store.errorMessage()).toBe('No se pudo cargar la caja.');

    store.refresh();
    expect(store.session()?.id).toBe(3);
    expect(store.errorMessage()).toBeNull();
  });
});

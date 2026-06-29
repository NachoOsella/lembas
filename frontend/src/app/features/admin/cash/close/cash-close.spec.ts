import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { HttpErrorResponse } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { CashClose } from './cash-close';
import { CashService } from '../../../../core/services/cash';
import { ErrorMappingService } from '../../../../core/services/error-mapping';
import {
  CashEntryDto,
  CashSessionDto,
  CashTotalsByMethod,
} from '../../../../shared/models/cash-session';

/** Builds an HttpErrorResponse with the given status + code for testing. */
function apiError(status: number, code: string, message = code): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    error: { status, code, message, timestamp: '2026-06-29T00:00:00Z', path: '/api/admin/cash-sessions/1/close' },
  });
}

/** Helper to build a minimal cash session DTO. */
function buildSession(overrides: Partial<CashSessionDto> = {}): CashSessionDto {
  return {
    id: 1,
    status: 'OPEN',
    branchId: 1,
    branchName: 'Centro',
    openedByUserId: 1,
    openedByUserName: 'Opener',
    openingCashAmount: '100.00',
    openedAt: '2026-06-29T08:00:00Z',
    entries: [],
    totalsByMethod: null,
    ...overrides,
  };
}

/** Helper to build a closed session DTO. */
function buildClosedSession(overrides: Partial<CashSessionDto> = {}): CashSessionDto {
  return {
    ...buildSession(),
    status: 'CLOSED',
    expectedCashAmount: '600.00',
    countedCashAmount: '600.00',
    cashDifferenceAmount: '0.00',
    cashDifferenceReason: null,
    closedByUserId: 2,
    closedByUserName: 'Closer',
    closedAt: '2026-06-29T20:00:00Z',
    totalsByMethod: {
      paymentsByMethod: { CASH: '500.00', QR: '100.00' },
      movementsByMethod: { CASH: '50.00' },
    },
    ...overrides,
  };
}

describe('CashClose', () => {
  let fixture: ComponentFixture<CashClose>;
  let component: CashClose;
  let cashService: {
    getById: ReturnType<typeof vi.fn>;
    closeSession: ReturnType<typeof vi.fn>;
  };
  let errorMapping: { getMessage: ReturnType<typeof vi.fn>; formatValidationErrors: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let messageService: MessageService;

  function configureRoute(sessionId: string | null) {
    cashService = { getById: vi.fn(), closeSession: vi.fn() };
    errorMapping = {
      getMessage: vi.fn((code: string, fallback?: string) => fallback ?? code),
      formatValidationErrors: vi.fn(() => 'validation error'),
    };
    router = { navigate: vi.fn().mockResolvedValue(true) };
    const route = {
      snapshot: { paramMap: { get: () => sessionId } },
    };

    TestBed.configureTestingModule({
      imports: [CashClose],
      providers: [
        provideNoopAnimations(),
        { provide: CashService, useValue: cashService },
        { provide: ErrorMappingService, useValue: errorMapping },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
        MessageService,
      ],
    });

    fixture = TestBed.createComponent(CashClose);
    component = fixture.componentInstance;
    messageService = TestBed.inject(MessageService);
    vi.spyOn(messageService, 'add');
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the session on init and renders the summary', async () => {
    const entries: CashEntryDto[] = [
      {
        kind: 'MANUAL',
        id: 1,
        type: 'CASH_IN',
        method: 'CASH',
        direction: 'IN',
        amount: '50.00',
        description: 'Cobro externo',
        registeredBy: 'Opener',
        occurredAt: '2026-06-29T08:30:00Z',
      },
    ];
    const totals: CashTotalsByMethod = {
      paymentsByMethod: { CASH: '500.00' },
      movementsByMethod: { CASH: '50.00' },
    };
    configureRoute('1');
    cashService.getById.mockReturnValue(of(buildSession({ entries, totalsByMethod: totals })));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(cashService.getById).toHaveBeenCalledWith(1);
    expect(component['session']()?.id).toBe(1);
    expect(component['entries']().length).toBe(1);
    expect(component['totalsByMethod']()).toEqual(totals);
    // expected = opening (100) + cash in (50) = 150 when backend does not provide it
    expect(component['expectedCash']()).toBe(150);
  });

  it('redirects to detail when the session is already closed', async () => {
    configureRoute('1');
    cashService.getById.mockReturnValue(of(buildClosedSession()));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(router.navigate).toHaveBeenCalledWith(['/admin/cash', 1]);
  });

  it('shows an error message when the session is missing', async () => {
    configureRoute('1');
    cashService.getById.mockReturnValue(throwError(() => apiError(404, 'CASH_SESSION_NOT_FOUND')));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component['errorMessage']()).toBe('CASH_SESSION_NOT_FOUND');
    expect(component['loading']()).toBe(false);
  });

  it('rejects an invalid session id and does not call the service', async () => {
    configureRoute('abc');

    fixture.detectChanges();
    await fixture.whenStable();

    expect(cashService.getById).not.toHaveBeenCalled();
    expect(component['errorMessage']()).toBe('Identificador de caja invalido.');
    expect(component['loading']()).toBe(false);
  });

  it('difference is zero when counted equals expected (no reason required)', async () => {
    configureRoute('1');
    cashService.getById.mockReturnValue(of(buildSession({ openingCashAmount: '500.00' })));

    fixture.detectChanges();
    await fixture.whenStable();

    component['countedCashAmount'].set(500);
    expect(component['expectedCash']()).toBe(500);
    expect(component['difference']()).toBe(0);
    expect(component['isDifferenceNonZero']()).toBe(false);
    expect(component['isReasonInvalid']()).toBe(false);
    expect(component['canSubmit']()).toBe(true);
  });

  it('difference is non-zero and reason is required when counted differs from expected', async () => {
    configureRoute('1');
    cashService.getById.mockReturnValue(of(buildSession({ openingCashAmount: '500.00' })));

    fixture.detectChanges();
    await fixture.whenStable();

    component['countedCashAmount'].set(450);
    expect(component['expectedCash']()).toBe(500);
    expect(component['difference']()).toBe(-50);
    expect(component['isDifferenceNonZero']()).toBe(true);
    expect(component['isReasonInvalid']()).toBe(true);
    expect(component['canSubmit']()).toBe(false);

    component['cashDifferenceReason'].set('Faltante por error de conteo');
    expect(component['isReasonInvalid']()).toBe(false);
    expect(component['canSubmit']()).toBe(true);
  });

  it('does not allow submit when counted is negative', async () => {
    configureRoute('1');
    cashService.getById.mockReturnValue(of(buildSession()));

    fixture.detectChanges();
    await fixture.whenStable();

    component['countedCashAmount'].set(-10);
    expect(component['canSubmit']()).toBe(false);
  });

  it('confirmClose sends POST /close and switches to the closed view', async () => {
    configureRoute('1');
    cashService.getById.mockReturnValue(of(buildSession({ openingCashAmount: '500.00' })));
    const closed = buildClosedSession({
      id: 1,
      expectedCashAmount: '500.00',
      countedCashAmount: '500.00',
      cashDifferenceAmount: '0.00',
    });
    cashService.closeSession.mockReturnValue(of(closed));

    fixture.detectChanges();
    await fixture.whenStable();

    component['countedCashAmount'].set(500);
    component['openConfirm']();
    expect(component['confirmDialogVisible']()).toBe(true);

    component['confirmClose']();
    await fixture.whenStable();

    expect(cashService.closeSession).toHaveBeenCalledWith(1, {
      countedCashAmount: '500.00',
      closingNotes: null,
      cashDifferenceReason: null,
    });
    expect(component['viewState']()).toBe('closed');
    expect(component['closedSnapshot']()).toEqual(closed);
    expect(component['confirmDialogVisible']()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'Caja cerrada' }),
    );
  });

  it('confirmClose sends the difference reason when difference is non-zero', async () => {
    configureRoute('1');
    cashService.getById.mockReturnValue(of(buildSession({ openingCashAmount: '500.00' })));
    cashService.closeSession.mockReturnValue(
      of(buildClosedSession({
        id: 1,
        expectedCashAmount: '500.00',
        countedCashAmount: '450.00',
        cashDifferenceAmount: '-50.00',
        cashDifferenceReason: 'Faltante por error de conteo',
      })),
    );

    fixture.detectChanges();
    await fixture.whenStable();

    component['countedCashAmount'].set(450);
    component['cashDifferenceReason'].set('Faltante por error de conteo');
    component['closingNotes'].set('Notas opcionales');
    component['openConfirm']();
    component['confirmClose']();
    await fixture.whenStable();

    expect(cashService.closeSession).toHaveBeenCalledWith(1, {
      countedCashAmount: '450.00',
      closingNotes: 'Notas opcionales',
      cashDifferenceReason: 'Faltante por error de conteo',
    });
  });

  it('confirmClose surfaces backend errors without flipping the view', async () => {
    configureRoute('1');
    cashService.getById.mockReturnValue(of(buildSession({ openingCashAmount: '500.00' })));
    cashService.closeSession.mockReturnValue(
      throwError(() => apiError(400, 'CASH_DIFFERENCE_REASON_REQUIRED', 'Reason required')),
    );

    fixture.detectChanges();
    await fixture.whenStable();

    component['countedCashAmount'].set(500);
    component['openConfirm']();
    component['confirmClose']();
    await fixture.whenStable();

    // The mock errorMapping returns the fallback message (apiError.message)
    // when the code is not in the mapping.
    expect(component['errorMessage']()).toBe('Reason required');
    expect(component['saving']()).toBe(false);
    expect(component['viewState']()).toBe('form');
  });

  it('shows CASH_SESSION_ALREADY_CLOSED error message when the backend rejects a double close', async () => {
    configureRoute('1');
    cashService.getById.mockReturnValue(of(buildSession({ openingCashAmount: '500.00' })));
    cashService.closeSession.mockReturnValue(
      throwError(() => apiError(409, 'CASH_SESSION_ALREADY_CLOSED', 'Already closed')),
    );

    fixture.detectChanges();
    await fixture.whenStable();

    component['countedCashAmount'].set(500);
    component['openConfirm']();
    component['confirmClose']();
    await fixture.whenStable();

    expect(component['errorMessage']()).toBe('Already closed');
  });

  it('cancel navigates back to the cash detail page', async () => {
    configureRoute('1');
    cashService.getById.mockReturnValue(of(buildSession()));

    fixture.detectChanges();
    await fixture.whenStable();

    component['cancel']();
    expect(router.navigate).toHaveBeenCalledWith(['/admin/cash', 1]);
  });

  it('viewDetail from the closed summary navigates to the detail page', async () => {
    configureRoute('1');
    cashService.getById.mockReturnValue(of(buildSession()));
    cashService.closeSession.mockReturnValue(of(buildClosedSession()));

    fixture.detectChanges();
    await fixture.whenStable();

    component['countedCashAmount'].set(100);
    component['openConfirm']();
    component['confirmClose']();
    await fixture.whenStable();

    component['viewDetail']();
    expect(router.navigate).toHaveBeenCalledWith(['/admin/cash', 1]);
  });

  it('goToLanding from the closed summary navigates to /admin/cash', async () => {
    configureRoute('1');
    cashService.getById.mockReturnValue(of(buildSession()));
    cashService.closeSession.mockReturnValue(of(buildClosedSession()));

    fixture.detectChanges();
    await fixture.whenStable();

    component['countedCashAmount'].set(100);
    component['openConfirm']();
    component['confirmClose']();
    await fixture.whenStable();

    component['goToLanding']();
    expect(router.navigate).toHaveBeenCalledWith(['/admin/cash']);
  });
});

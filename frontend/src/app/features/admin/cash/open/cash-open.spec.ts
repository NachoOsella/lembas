import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { HttpErrorResponse } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { describe, it, expect, vi } from 'vitest';

import { CashOpen } from './cash-open';
import { CashService } from '../../../../core/services/cash';
import { AuthService } from '../../../../core/services/auth';
import { UserService } from '../../../../core/services/user';
import { ErrorMappingService } from '../../../../core/services/error-mapping';
import { CashSessionDto } from '../../../../shared/models/cash-session';

/** Unit tests for the cash opening form (S3-US06 subtask 13). */
describe('CashOpen', () => {
  let fixture: ComponentFixture<CashOpen>;
  let component: CashOpen;
  let cashService: {
    openSession: ReturnType<typeof vi.fn>;
    currentSession: ReturnType<typeof vi.fn>;
  };
  let router: { navigate: ReturnType<typeof vi.fn> };

  function configureAs(role: 'ADMIN' | 'EMPLOYEE', branchId: number | null) {
    cashService = { openSession: vi.fn(), currentSession: vi.fn() };
    router = { navigate: vi.fn().mockResolvedValue(true) };
    const auth = {
      currentUser: vi.fn().mockReturnValue({
        id: 1,
        email: 'a@b.com',
        firstName: 'A',
        lastName: 'B',
        role,
        branchId,
        branchName: branchId ? 'Centro' : null,
      }),
      getUserRole: vi.fn().mockReturnValue(role),
    };
    const userService = {
      listBranches: vi.fn().mockReturnValue(of([{ id: 1, name: 'Centro', active: true }])),
    };

    TestBed.configureTestingModule({
      imports: [CashOpen],
      providers: [
        provideNoopAnimations(),
        MessageService,
        ErrorMappingService,
        { provide: CashService, useValue: cashService },
        { provide: AuthService, useValue: auth },
        { provide: UserService, useValue: userService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
      ],
    });

    fixture = TestBed.createComponent(CashOpen);
    component = fixture.componentInstance;
  }

  function openSession(id = 5): CashSessionDto {
    return {
      id,
      status: 'OPEN',
      branchId: 1,
      branchName: 'Centro',
      openedByUserId: 1,
      openedByUserName: 'A B',
      openingCashAmount: '100.00',
    };
  }

  function apiError(status: number, code: string): HttpErrorResponse {
    return new HttpErrorResponse({ status, error: { code, status } });
  }

  it('disables submit until the amount is set (employee)', async () => {
    configureAs('EMPLOYEE', 1);
    cashService.currentSession.mockReturnValue(
      throwError(() => apiError(404, 'CASH_SESSION_NOT_FOUND')),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component['isAdmin']()).toBe(false);
    expect(component['canSubmit']()).toBe(false);
    component['openingCashAmount'].set(100);
    fixture.detectChanges();
    expect(component['canSubmit']()).toBe(true);
  });

  it('redirects to the open session detail when one already exists', async () => {
    configureAs('EMPLOYEE', 1);
    cashService.currentSession.mockReturnValue(of(openSession(9)));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(router.navigate).toHaveBeenCalledWith(['/admin/cash', 9]);
  });

  it('opens and redirects on success', async () => {
    configureAs('EMPLOYEE', 1);
    cashService.currentSession.mockReturnValue(
      throwError(() => apiError(404, 'CASH_SESSION_NOT_FOUND')),
    );
    cashService.openSession.mockReturnValue(of(openSession(11)));
    fixture.detectChanges();
    await fixture.whenStable();

    component['openingCashAmount'].set(150);
    component['submit']();
    await fixture.whenStable();

    expect(cashService.openSession).toHaveBeenCalled();
    const req = cashService.openSession.mock.calls[0][0];
    expect(req.openingCashAmount).toBe('150.00');
    expect(req.branchId).toBeNull(); // non-admin ignores branch
    expect(router.navigate).toHaveBeenCalledWith(['/admin/cash', 11]);
  });

  it('maps CASH_SESSION_ALREADY_OPEN to a friendly message', async () => {
    configureAs('EMPLOYEE', 1);
    cashService.currentSession.mockReturnValue(
      throwError(() => ({ error: { code: 'CASH_SESSION_NOT_FOUND' } })),
    );
    cashService.openSession.mockReturnValue(
      throwError(() => apiError(409, 'CASH_SESSION_ALREADY_OPEN')),
    );

    fixture.detectChanges();
    await fixture.whenStable();
    component['openingCashAmount'].set(50);
    component['submit']();
    await fixture.whenStable();

    expect(component['errorMessage']()).toContain('caja abierta');
  });

  it('applyQuickAmount sets the opening amount from a chip', async () => {
    configureAs('EMPLOYEE', 1);
    cashService.currentSession.mockReturnValue(
      throwError(() => apiError(404, 'CASH_SESSION_NOT_FOUND')),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    component['applyQuickAmount'](20000);
    expect(component['openingCashAmount']()).toBe(20000);
  });

  it('amountPreview renders placeholder when no amount is set', async () => {
    configureAs('EMPLOYEE', 1);
    cashService.currentSession.mockReturnValue(
      throwError(() => apiError(404, 'CASH_SESSION_NOT_FOUND')),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component['amountPreview']()).toContain('Ingresa el monto');
    expect(component['hasAmount']()).toBe(false);
  });

  it('amountPreview renders formatted ARS currency when amount is set', async () => {
    configureAs('EMPLOYEE', 1);
    cashService.currentSession.mockReturnValue(
      throwError(() => apiError(404, 'CASH_SESSION_NOT_FOUND')),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    component['openingCashAmount'].set(12345.6);
    expect(component['amountPreview']()).toContain('12.345,60');
    expect(component['hasAmount']()).toBe(true);
  });
});

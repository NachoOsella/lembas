import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Cash } from './cash';
import { CashService } from '@features/cash/data-access/cash';
import { AuthService } from '@core/services/auth';
import type { CashSessionDto } from '@features/cash/domain/cash-session';

/** Unit tests for the cash landing redirect component. */
describe('Cash landing (redirect)', () => {
  let fixture: ComponentFixture<Cash>;
  let cashService: { currentSession: ReturnType<typeof vi.fn> };
  let auth: { currentUser: ReturnType<typeof vi.fn>; getUserRole: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

  function configure(authUser: { role: string; branchId: number | null } | null) {
    cashService = { currentSession: vi.fn() };
    auth = {
      currentUser: vi.fn().mockReturnValue(authUser),
      getUserRole: vi.fn().mockReturnValue(authUser?.role ?? null),
    };
    router = { navigate: vi.fn().mockResolvedValue(true) };
    const route = { snapshot: { paramMap: { get: () => null } } };

    TestBed.configureTestingModule({
      imports: [Cash],
      providers: [
        provideNoopAnimations(),
        { provide: CashService, useValue: cashService },
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
        { provide: MessageService, useValue: { add: vi.fn() } },
      ],
    });

    fixture = TestBed.createComponent(Cash);
  }

  beforeEach(async () => {
    // tests call configure() themselves; nothing global needed.
  });

  it('redirects to open when no user is authenticated', async () => {
    configure(null);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(router.navigate).toHaveBeenCalledWith(['/admin/cash/open']);
  });

  it('redirects to the open session detail when an employee has one', async () => {
    configure({ role: 'EMPLOYEE', branchId: 1 });
    const session: CashSessionDto = {
      id: 7,
      status: 'OPEN',
      branchId: 1,
      branchName: 'Centro',
      openedByUserId: 2,
      openedByUserName: 'Empleado',
      openingCashAmount: '100.00',
    };
    cashService.currentSession.mockReturnValue(of(session));

    fixture.detectChanges();
    await fixture.whenStable();
    expect(cashService.currentSession).toHaveBeenCalledWith(1);
    expect(router.navigate).toHaveBeenCalledWith(['/admin/cash', 7]);
  });

  it('redirects to open when the employee has no open session', async () => {
    configure({ role: 'EMPLOYEE', branchId: 1 });
    cashService.currentSession.mockReturnValue(throwError(() => ({ status: 404 })));

    fixture.detectChanges();
    await fixture.whenStable();
    expect(router.navigate).toHaveBeenCalledWith(['/admin/cash/open']);
  });

  it('redirects admin straight to the open form', async () => {
    configure({ role: 'ADMIN', branchId: null });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(cashService.currentSession).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/admin/cash/open']);
  });
});

import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { describe, it, expect, vi } from 'vitest';

import { MovementForm } from './movement-form';
import { CashService } from '@features/cash/data-access/cash';
import { ErrorMappingService } from '@core/services/error-mapping';
import type { CashMovementDto } from '@features/cash/domain/cash-session';

describe('MovementForm', () => {
  let fixture: ComponentFixture<MovementForm>;
  let component: MovementForm;
  let cashService: { addMovement: ReturnType<typeof vi.fn> };

  function createComponent() {
    cashService = { addMovement: vi.fn() };

    TestBed.configureTestingModule({
      imports: [MovementForm],
      providers: [
        provideNoopAnimations(),
        MessageService,
        ErrorMappingService,
        { provide: CashService, useValue: cashService },
      ],
    });

    fixture = TestBed.createComponent(MovementForm);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('sessionId', 5);
    fixture.detectChanges();
  }

  function movementDto(): CashMovementDto {
    return {
      id: 1,
      cashSessionId: 5,
      type: 'CASH_IN',
      method: 'CASH',
      amount: '100.00',
      reason: 'test',
      createdByUserId: 1,
      createdByUserName: 'Admin',
      createdAt: new Date().toISOString(),
    };
  }

  it('submit is disabled when required fields are empty', async () => {
    createComponent();
    await fixture.whenStable();

    expect(component['canSubmit']()).toBe(false);

    component['selectType']('CASH_IN');
    component['selectMethod']('CASH');
    component['setAmount'](100);
    component['setReason']('test reason');
    fixture.detectChanges();

    expect(component['canSubmit']()).toBe(true);
  });

  it('submit is disabled when amount is zero', async () => {
    createComponent();
    await fixture.whenStable();

    component['selectType']('CASH_IN');
    component['selectMethod']('CASH');
    component['setAmount'](0);
    component['setReason']('test');
    fixture.detectChanges();

    expect(component['canSubmit']()).toBe(false);
  });

  it('submit is disabled when disabled input is true', async () => {
    createComponent();
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    await fixture.whenStable();

    component['selectType']('CASH_IN');
    component['selectMethod']('CASH');
    component['setAmount'](50);
    component['setReason']('test');
    fixture.detectChanges();

    expect(component['canSubmit']()).toBe(false);
  });

  it('calls service and emits on success', async () => {
    createComponent();
    cashService.addMovement.mockReturnValue(of(movementDto()));
    const movementAddedSpy = vi.fn();
    component.movementAdded.subscribe(movementAddedSpy);

    component['selectType']('CASH_IN');
    component['selectMethod']('CASH');
    component['setAmount'](50);
    component['setReason']('test reason');
    component['submit']();
    await fixture.whenStable();

    expect(cashService.addMovement).toHaveBeenCalledWith(5, {
      type: 'CASH_IN',
      method: 'CASH',
      amount: '50.00',
      reason: 'test reason',
    });
    expect(movementAddedSpy).toHaveBeenCalled();
  });

  it('shows error message on backend failure', async () => {
    createComponent();
    const error = new HttpErrorResponse({
      status: 400,
      error: {
        status: 400,
        code: 'CASH_MOVEMENT_CLOSED_SESSION',
        message: 'The cash session is closed.',
      },
    });
    cashService.addMovement.mockReturnValue(throwError(() => error));

    component['selectType']('CASH_OUT');
    component['selectMethod']('TRANSFER');
    component['setAmount'](200);
    component['setReason']('payment');
    component['submit']();
    await fixture.whenStable();

    expect(component['errorMessage']()).toContain('cerrada');
  });

  it('resets form fields after successful submission', async () => {
    createComponent();
    cashService.addMovement.mockReturnValue(of(movementDto()));

    component['selectType']('CASH_IN');
    component['selectMethod']('CASH');
    component['setAmount'](75);
    component['setReason']('some reason');
    component['submit']();
    await fixture.whenStable();

    expect(component['type']()).toBeNull();
    expect(component['amount']()).toBeNull();
    expect(component['reason']()).toBe('');
  });

  it('selectType updates the selected type signal', async () => {
    createComponent();
    await fixture.whenStable();

    component['selectType']('CASH_OUT');
    expect(component['type']()).toBe('CASH_OUT');
  });

  it('selectMethod updates the selected method signal', async () => {
    createComponent();
    await fixture.whenStable();

    component['selectMethod']('TRANSFER');
    expect(component['method']()).toBe('TRANSFER');
  });

  it('selectors are no-ops when the form is disabled', async () => {
    createComponent();
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    await fixture.whenStable();

    component['selectType']('CASH_IN');
    component['selectMethod']('OTHER');
    expect(component['type']()).toBeNull();
    expect(component['method']()).toBeNull();
  });

  it('exposes the selected type description for the live preview', async () => {
    createComponent();
    await fixture.whenStable();

    expect(component['selectedTypeDescription']()).toBeNull();

    component['selectType']('ADJUSTMENT');
    expect(component['selectedTypeDescription']()).toContain('Correccion');
  });

  it('renders a movement preview only when type and amount are present', async () => {
    createComponent();
    await fixture.whenStable();

    expect(component['movementPreview']()).toBeNull();

    component['selectType']('CASH_IN');
    component['setAmount'](1234.5);
    expect(component['movementPreview']()).toContain('1.234,50');
  });
});

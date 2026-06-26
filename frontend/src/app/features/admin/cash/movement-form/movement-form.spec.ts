import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { describe, it, expect, vi } from 'vitest';

import { MovementForm } from './movement-form';
import { CashService } from '../../../../core/services/cash';
import { ErrorMappingService } from '../../../../core/services/error-mapping';
import {
  CashMovementDto,
  CashMovementMethod,
  CashMovementType,
} from '../../../../shared/models/cash-session';

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
      type: 'CASH_IN' as CashMovementType,
      method: 'CASH' as CashMovementMethod,
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

    component['type'].set('CASH_IN');
    component['method'].set('CASH');
    component['amount'].set(100);
    component['reason'].set('test reason');
    fixture.detectChanges();

    expect(component['canSubmit']()).toBe(true);
  });

  it('submit is disabled when amount is zero', async () => {
    createComponent();
    await fixture.whenStable();

    component['type'].set('CASH_IN');
    component['method'].set('CASH');
    component['amount'].set(0);
    component['reason'].set('test');
    fixture.detectChanges();

    expect(component['canSubmit']()).toBe(false);
  });

  it('submit is disabled when disabled input is true', async () => {
    createComponent();
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    await fixture.whenStable();

    component['type'].set('CASH_IN');
    component['method'].set('CASH');
    component['amount'].set(50);
    component['reason'].set('test');
    fixture.detectChanges();

    expect(component['canSubmit']()).toBe(false);
  });

  it('calls service and emits on success', async () => {
    createComponent();
    cashService.addMovement.mockReturnValue(of(movementDto()));
    const movementAddedSpy = vi.fn();
    component.movementAdded.subscribe(movementAddedSpy);

    component['type'].set('CASH_IN');
    component['method'].set('CASH');
    component['amount'].set(50);
    component['reason'].set('test reason');
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
      error: { code: 'CASH_MOVEMENT_CLOSED_SESSION', status: 400 },
    });
    cashService.addMovement.mockReturnValue(throwError(() => error));

    component['type'].set('CASH_OUT');
    component['method'].set('TRANSFER');
    component['amount'].set(200);
    component['reason'].set('payment');
    component['submit']();
    await fixture.whenStable();

    expect(component['errorMessage']()).toContain('cerrada');
  });

  it('resets form fields after successful submission', async () => {
    createComponent();
    cashService.addMovement.mockReturnValue(of(movementDto()));

    component['type'].set('CASH_IN');
    component['method'].set('CASH');
    component['amount'].set(75);
    component['reason'].set('some reason');
    component['submit']();
    await fixture.whenStable();

    expect(component['type']()).toBeNull();
    expect(component['amount']()).toBeNull();
    expect(component['reason']()).toBe('');
  });
});

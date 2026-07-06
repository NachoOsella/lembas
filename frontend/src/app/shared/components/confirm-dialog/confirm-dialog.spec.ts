import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { ConfirmDialog } from './confirm-dialog';

describe('ConfirmDialog', () => {
  let component: ConfirmDialog;
  let fixture: ComponentFixture<ConfirmDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialog);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose inputs with sensible defaults', () => {
    expect(component.title()).toBe('Confirmar accion');
    expect(component.mode()).toBe('confirm');
    expect(component.destructive()).toBe(false);
    expect(component.reasonRequired()).toBe(false);
    expect(component.reasonMaxLength()).toBe(500);
  });

  it('should NOT emit confirmed when reason is empty in confirm-with-reason mode', () => {
    fixture.componentRef.setInput('mode', 'confirm-with-reason');
    fixture.componentRef.setInput('reasonRequired', true);
    component.reason.set('');
    let emitted = false;
    component.confirmed.subscribe(() => (emitted = true));
    component.onConfirm();
    expect(emitted).toBe(false);
    expect(component.reasonError()).toBeTruthy();
  });

  it('should emit confirmed when reason is non-blank', () => {
    fixture.componentRef.setInput('mode', 'confirm-with-reason');
    fixture.componentRef.setInput('reasonRequired', true);
    component.reason.set('Cliente desiste del pedido');
    let emitted = false;
    component.confirmed.subscribe(() => (emitted = true));
    component.onConfirm();
    expect(emitted).toBe(true);
    expect(component.reasonError()).toBe('');
  });

  it('should reject reason longer than max length', () => {
    fixture.componentRef.setInput('mode', 'confirm-with-reason');
    fixture.componentRef.setInput('reasonRequired', true);
    fixture.componentRef.setInput('reasonMaxLength', 5);
    component.reason.set('a'.repeat(10));
    let emitted = false;
    component.confirmed.subscribe(() => (emitted = true));
    component.onConfirm();
    expect(emitted).toBe(false);
    expect(component.reasonError()).toContain('5');
  });

  it('should emit confirmed in plain confirm mode without a reason', () => {
    fixture.componentRef.setInput('mode', 'confirm');
    let emitted = false;
    component.confirmed.subscribe(() => (emitted = true));
    component.onConfirm();
    expect(emitted).toBe(true);
  });

  it('should emit cancelled when onCancel is called', () => {
    let cancelled = false;
    component.cancelled.subscribe(() => (cancelled = true));
    component.onCancel();
    expect(cancelled).toBe(true);
  });

  it('should clear the inline reason error when the user types', () => {
    fixture.componentRef.setInput('mode', 'confirm-with-reason');
    fixture.componentRef.setInput('reasonRequired', true);
    component.reason.set('');
    component.onConfirm();
    expect(component.reasonError()).toBeTruthy();
    component.onReasonInput();
    expect(component.reasonError()).toBe('');
  });
});

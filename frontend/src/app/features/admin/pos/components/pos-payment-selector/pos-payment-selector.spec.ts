import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { PosPaymentSelectorComponent } from './pos-payment-selector';

/** Unit tests for {@link PosPaymentSelectorComponent}. */
describe('PosPaymentSelectorComponent', () => {
  let fixture: ComponentFixture<PosPaymentSelectorComponent>;
  let component: PosPaymentSelectorComponent;

  function createComponent(): void {
    TestBed.configureTestingModule({
      imports: [PosPaymentSelectorComponent],
    });
    fixture = TestBed.createComponent(PosPaymentSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create the component', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  it('renders one pill per supported POS payment method', () => {
    createComponent();
    const options = fixture.nativeElement.querySelectorAll('.pos-payment-selector__option');
    // CASH, QR, TRANSFER, DEBIT_CARD, CREDIT_CARD = 5 (no CHECKOUT_PRO / OTHER)
    expect(options.length).toBe(5);
    const labels = Array.from(options).map((b) => (b as HTMLElement).textContent?.trim() ?? '');
    expect(labels).toEqual(['Efectivo', 'QR', 'Transferencia', 'Debito', 'Credito']);
  });

  it('marks the current value as active with aria-checked', () => {
    createComponent();
    component.value.set('CASH');
    fixture.detectChanges();
    const cashOption = fixture.nativeElement.querySelector(
      '[data-testid="pos-method-CASH"]',
    ) as HTMLButtonElement;
    expect(cashOption).toBeTruthy();
    expect(cashOption.classList.contains('pos-payment-selector__option--active')).toBe(true);
    expect(cashOption.getAttribute('aria-checked')).toBe('true');
  });

  it('emits selection on click', () => {
    createComponent();
    const emitted: (string | null)[] = [];
    component.value.subscribe((v) => emitted.push(v));
    const qrButton = fixture.nativeElement.querySelector(
      '[data-testid="pos-method-QR"]',
    ) as HTMLButtonElement;
    qrButton.click();
    expect(emitted).toEqual(['QR']);
  });

  it('does not emit when disabled', () => {
    createComponent();
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const emitted: (string | null)[] = [];
    component.value.subscribe((v) => emitted.push(v));
    const cashButton = fixture.nativeElement.querySelector(
      '[data-testid="pos-method-CASH"]',
    ) as HTMLButtonElement;
    expect(cashButton.disabled).toBe(true);
    cashButton.click();
    expect(emitted).toEqual([]);
  });
});

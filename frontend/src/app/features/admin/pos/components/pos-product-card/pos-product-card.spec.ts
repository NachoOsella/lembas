import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosProductCardComponent } from './pos-product-card';
import { PosProductSearchItem } from '../../services/pos-product-search.service';

/** Builds a fixture row for tests. */
function buildItem(
  overrides: Partial<PosProductSearchItem> = {},
): PosProductSearchItem {
  return {
    id: 1,
    name: 'Aceite de oliva 500ml',
    brandName: 'Lembas',
    barcode: '7501',
    salePrice: 2500,
    availableStock: 5,
    imageUrl: null,
    ...overrides,
  };
}

/** Unit tests for {@link PosProductCardComponent}. */
describe('PosProductCardComponent', () => {
  let fixture: ComponentFixture<PosProductCardComponent>;
  let component: PosProductCardComponent;

  function createComponent(item: PosProductSearchItem, disabled = false): void {
    TestBed.configureTestingModule({
      imports: [PosProductCardComponent],
    });
    fixture = TestBed.createComponent(PosProductCardComponent);
    component = fixture.componentInstance;
    component.item = item;
    component.disabled = disabled;
    fixture.detectChanges();
  }

  function button(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  }

  it('should create the component', () => {
    createComponent(buildItem());
    expect(component).toBeTruthy();
  });

  it('renders the product name as the card title', () => {
    createComponent(buildItem({ name: 'Yerba 1kg' }));
    const title = fixture.nativeElement.querySelector(
      '.pos-card__name',
    ) as HTMLElement;
    expect(title.textContent?.trim()).toContain('Yerba 1kg');
  });

  it('renders the brand name when provided', () => {
    createComponent(buildItem({ brandName: 'Cruz de Malta' }));
    const brand = fixture.nativeElement.querySelector(
      '.pos-card__brand',
    ) as HTMLElement;
    expect(brand.textContent?.trim()).toBe('Cruz de Malta');
  });

  it('hides the brand line when brandName is null', () => {
    createComponent(buildItem({ brandName: null }));
    expect(fixture.nativeElement.querySelector('.pos-card__brand')).toBeNull();
  });

  it('formats the price with es-AR thousands separator and no decimals', () => {
    createComponent(buildItem({ salePrice: 2500 }));
    const price = fixture.nativeElement.querySelector(
      '.pos-card__price',
    ) as HTMLElement;
    // Intl es-AR: "2.500"
    expect(price.textContent?.trim()).toContain('2.500');
  });

  it('does NOT render the barcode on the card anymore', () => {
    createComponent(buildItem({ barcode: '7501234567890' }));
    const barcode = fixture.nativeElement.querySelector(
      '.pos-card__barcode',
    );
    expect(barcode).toBeNull();
  });

  it('shows "N en stock" with the ok tone when availableStock > 0', () => {
    createComponent(buildItem({ availableStock: 7 }));
    const badge = fixture.nativeElement.querySelector(
      '[data-testid^="pos-card-stock-"] .pos-card__stock',
    ) as HTMLElement;
    expect(badge.textContent).toContain('7 en stock');
    expect(badge.classList.contains('pos-card__stock--ok')).toBe(true);
  });

  it('shows "Sin stock" with the out tone when availableStock is 0', () => {
    createComponent(buildItem({ availableStock: 0 }));
    const badge = fixture.nativeElement.querySelector(
      '[data-testid^="pos-card-stock-"] .pos-card__stock',
    ) as HTMLElement;
    expect(badge.textContent?.trim()).toBe('Sin stock');
    expect(badge.classList.contains('pos-card__stock--out')).toBe(true);
  });

  it('shows "Sin stock" with the out tone when availableStock is negative', () => {
    createComponent(buildItem({ availableStock: -3 }));
    const badge = fixture.nativeElement.querySelector(
      '[data-testid^="pos-card-stock-"] .pos-card__stock',
    ) as HTMLElement;
    expect(badge.textContent?.trim()).toBe('Sin stock');
  });

  it('shows "Verificar stock" with the unknown tone when availableStock is null', () => {
    createComponent(buildItem({ availableStock: null }));
    const badge = fixture.nativeElement.querySelector(
      '[data-testid^="pos-card-stock-"] .pos-card__stock',
    ) as HTMLElement;
    expect(badge.textContent?.trim()).toBe('Verificar stock');
    expect(badge.classList.contains('pos-card__stock--unknown')).toBe(true);
  });

  it('emits selected on click when not disabled', () => {
    createComponent(buildItem());
    const emitted: PosProductSearchItem[] = [];
    component.selected.subscribe((item) => emitted.push(item));
    button().click();
    expect(emitted).toHaveLength(1);
    expect(emitted[0].id).toBe(1);
  });

  it('does not emit when disabled', () => {
    createComponent(buildItem(), true);
    const emitted: PosProductSearchItem[] = [];
    component.selected.subscribe((item) => emitted.push(item));
    button().click();
    expect(emitted).toEqual([]);
  });

  it('reflects the disabled state on the host button', () => {
    createComponent(buildItem(), true);
    const btn = button();
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute('aria-disabled')).toBe('true');
  });

  it('announces the full a11y label (name + price + stock state)', () => {
    createComponent(buildItem({ name: 'Yerba', salePrice: 1800, availableStock: 3 }));
    const btn = button();
    expect(btn.getAttribute('aria-label')).toContain('Yerba');
    expect(btn.getAttribute('aria-label')).toContain('1.800');
    expect(btn.getAttribute('aria-label')).toContain('3 en stock');
  });

  it('appends "sin stock" to the a11y label when the card is disabled', () => {
    createComponent(buildItem({ name: 'Agotado', availableStock: 0 }), true);
    const btn = button();
    expect(btn.getAttribute('aria-label')).toContain('(sin stock)');
  });
});

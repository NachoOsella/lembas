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

  it('should create the component', () => {
    createComponent(buildItem());
    expect(component).toBeTruthy();
  });

  it('renders the product name, price and barcode', () => {
    createComponent(buildItem({ name: 'Yerba 1kg', salePrice: 1800, barcode: '7790001' }));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Yerba 1kg');
    expect(text).toContain('1800');
    expect(text).toContain('7790001');
  });

  it('renders the brand name when provided', () => {
    createComponent(buildItem({ brandName: 'Cruz de Malta' }));
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Cruz de Malta');
  });

  it('emits selected on click when not disabled', () => {
    createComponent(buildItem());
    const emitted: PosProductSearchItem[] = [];
    component.selected.subscribe((item) => emitted.push(item));
    const button = (fixture.nativeElement as HTMLElement).querySelector(
      'button',
    ) as HTMLButtonElement;
    expect(button).toBeTruthy();
    button.click();
    expect(emitted).toHaveLength(1);
    expect(emitted[0].id).toBe(1);
  });

  it('does not emit when disabled', () => {
    createComponent(buildItem(), true);
    const emitted: PosProductSearchItem[] = [];
    component.selected.subscribe((item) => emitted.push(item));
    const button = (fixture.nativeElement as HTMLElement).querySelector(
      'button',
    ) as HTMLButtonElement;
    button.click();
    expect(emitted).toEqual([]);
  });

  it('shows the "sin stock" label when availableStock is zero', () => {
    createComponent(buildItem({ availableStock: 0 }));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('sin stock');
  });

  it('shows the "sin stock" label when availableStock is negative', () => {
    createComponent(buildItem({ availableStock: -3 }));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('sin stock');
  });

  it('shows the numeric stock when availableStock is positive', () => {
    createComponent(buildItem({ availableStock: 7 }));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('stock: 7');
    expect(text).not.toContain('sin stock');
  });

  it('shows "stock: —" when availableStock is null', () => {
    createComponent(buildItem({ availableStock: null }));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('stock: —');
    expect(text).not.toContain('sin stock');
  });

  it('reflects the disabled state on the host button', () => {
    createComponent(buildItem(), true);
    const button = (fixture.nativeElement as HTMLElement).querySelector(
      'button',
    ) as HTMLButtonElement;
    expect(button).toBeTruthy();
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });
});

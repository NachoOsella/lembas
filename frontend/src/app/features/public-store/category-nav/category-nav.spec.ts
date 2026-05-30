import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StoreCategory } from '../../../shared/models/category';
import { CategoryNav } from './category-nav';

const CATEGORIES: StoreCategory[] = [
  { id: 1, name: 'Cereales', productCount: 3 },
  { id: 2, name: 'Bebidas', productCount: 5 },
  { id: 3, name: 'Snacks', productCount: 2 },
];

describe('CategoryNav', () => {
  let component: CategoryNav;
  let fixture: ComponentFixture<CategoryNav>;

  function configure(
    categories: StoreCategory[] = CATEGORIES,
    loading = false,
    error = false,
  ): void {
    TestBed.configureTestingModule({
      imports: [CategoryNav],
    });

    fixture = TestBed.createComponent(CategoryNav);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('categories', categories);
    fixture.componentRef.setInput('loading', loading);
    fixture.componentRef.setInput('error', error);
    fixture.detectChanges();
  }

  it('should create', () => {
    configure();
    expect(component).toBeTruthy();
  });

  // --- Loading state ---

  it('should show skeleton pills when loading', async () => {
    configure(CATEGORIES, true);
    await fixture.whenStable();
    const skeletons = fixture.nativeElement.querySelectorAll('.catnav__skeleton-pill');
    expect(skeletons.length).toBe(6);
  });

  // --- Error state ---

  it('should show error message when error is true', async () => {
    configure(CATEGORIES, false, true);
    await fixture.whenStable();
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('No se pudieron cargar las categorias');
  });

  it('should not show pills when error is true', async () => {
    configure(CATEGORIES, false, true);
    await fixture.whenStable();
    const pills = fixture.nativeElement.querySelectorAll('.catnav__pill');
    expect(pills.length).toBe(0);
  });

  // --- Empty state ---

  it('should show empty message when categories array is empty', async () => {
    configure([]);
    await fixture.whenStable();
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Aun no hay categorias disponibles');
  });

  // --- Category pills ---

  it('should render "Todas" pill plus category pills', async () => {
    configure();
    await fixture.whenStable();
    const pills = fixture.nativeElement.querySelectorAll('.catnav__pill');
    expect(pills.length).toBe(4); // Todas + 3 categories
  });

  it('should show "Todas" as the first pill', async () => {
    configure();
    await fixture.whenStable();
    const pills = fixture.nativeElement.querySelectorAll('.catnav__pill');
    expect(pills[0].textContent?.trim()).toBe('Todas');
  });

  it('should render each category name', async () => {
    configure();
    await fixture.whenStable();
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Cereales');
    expect(text).toContain('Bebidas');
    expect(text).toContain('Snacks');
  });

  it('should show product count badge for categories with products', async () => {
    configure();
    await fixture.whenStable();
    const counts = fixture.nativeElement.querySelectorAll('.catnav__count');
    expect(counts.length).toBe(3);
    expect(counts[0].textContent?.trim()).toBe('3');
  });

  it('should not show count badge when productCount is 0', async () => {
    configure([{ id: 1, name: 'Empty', productCount: 0 }]);
    await fixture.whenStable();
    const counts = fixture.nativeElement.querySelectorAll('.catnav__count');
    expect(counts.length).toBe(0);
  });

  // --- Selection ---

  it('should mark "Todas" as active by default', async () => {
    configure();
    await fixture.whenStable();
    const pills = fixture.nativeElement.querySelectorAll('.catnav__pill');
    expect(pills[0].classList.contains('catnav__pill--active')).toBe(true);
  });

  it('should emit allSelected when "Todas" is clicked', async () => {
    configure();
    await fixture.whenStable();
    const spy = vi.fn();
    component.allSelected.subscribe(spy);

    const pills = fixture.nativeElement.querySelectorAll('.catnav__pill');
    pills[0].click();

    expect(spy).toHaveBeenCalled();
  });

  it('should emit categorySelected when a category pill is clicked', async () => {
    configure();
    await fixture.whenStable();
    const spy = vi.fn();
    component.categorySelected.subscribe(spy);

    const pills = fixture.nativeElement.querySelectorAll('.catnav__pill');
    pills[2].click(); // Click "Bebidas" (index 2: Todas=0, Cereales=1, Bebidas=2)

    expect(spy).toHaveBeenCalledWith(2);
  });

  it('should highlight selected category', async () => {
    configure();
    fixture.componentRef.setInput('selectedCategoryId', 2);
    fixture.detectChanges();
    await fixture.whenStable();

    const pills = fixture.nativeElement.querySelectorAll('.catnav__pill');
    // Pill at index 2 is Bebidas
    expect(pills[2].classList.contains('catnav__pill--active')).toBe(true);
    expect(pills[0].classList.contains('catnav__pill--active')).toBe(false);
  });

  // --- Horizontal scroll ---

  it('should have scrollable container class', async () => {
    configure();
    await fixture.whenStable();
    const nav = fixture.nativeElement.querySelector('.catnav--scroll');
    expect(nav).toBeTruthy();
  });
});

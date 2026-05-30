import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StoreCategory } from '../../../shared/models/category';
import { CategoryNav } from './category-nav';

const CATEGORIES: StoreCategory[] = [
  { id: 1, name: 'Cereales', productCount: 3 },
  { id: 2, name: 'Bebidas', productCount: 5 },
  { id: 3, name: 'Snacks', productCount: 2 },
  { id: 4, name: 'Aceites Esenciales', productCount: 7 },
  { id: 5, name: 'Frutos Secos', productCount: 4 },
  { id: 6, name: 'Cosmetica Natural', productCount: 6 },
  { id: 7, name: 'Hierbas', productCount: 8 },
  { id: 8, name: 'Panaderia', productCount: 1 },
];

describe('CategoryNav', () => {
  let component: CategoryNav;
  let fixture: ComponentFixture<CategoryNav>;

  function configure(
    categories: StoreCategory[] = CATEGORIES,
    loading = false,
    error = false,
  ): void {
    TestBed.configureTestingModule({ imports: [CategoryNav] });
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

  it('should show skeleton when loading', async () => {
    configure(CATEGORIES, true);
    await fixture.whenStable();
    const pills = fixture.nativeElement.querySelectorAll('.catnav-skeleton__pill');
    expect(pills.length).toBe(6);
  });

  it('should show error when error is true', async () => {
    configure(CATEGORIES, false, true);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar las categorias');
  });

  it('should show empty state when no categories', async () => {
    configure([]);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Aún no hay categorías disponibles');
  });

  it('should render quick pills plus "Todas las categorías" button', async () => {
    configure();
    await fixture.whenStable();
    const pills = fixture.nativeElement.querySelectorAll('.catnav-pills__item');
    // Todas + 6 quick + Todas las categorías button
    expect(pills.length).toBe(8);
    expect(pills[0].textContent?.trim()).toBe('Todas');
  });

  it('should mark "Todas" as active by default', async () => {
    configure();
    await fixture.whenStable();
    const pills = fixture.nativeElement.querySelectorAll('.catnav-pills__item');
    expect(pills[0].classList.contains('catnav-pills__item--active')).toBe(true);
  });

  it('should emit allSelected when "Todas" is clicked', async () => {
    configure();
    await fixture.whenStable();
    const spy = vi.fn();
    component.allSelected.subscribe(spy);
    const pills = fixture.nativeElement.querySelectorAll('.catnav-pills__item');
    pills[0].click();
    expect(spy).toHaveBeenCalled();
  });

  it('should emit categorySelected when a quick pill is clicked', async () => {
    configure();
    await fixture.whenStable();
    const spy = vi.fn();
    component.categorySelected.subscribe(spy);
    const pills: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.catnav-pills__item'));
    // Hierbas has highest product count (8), should be among quick pills
    const hierbas = pills.find((p) => p.textContent?.includes('Hierbas'));
    hierbas?.click();
    expect(spy).toHaveBeenCalledWith(7);
  });

  it('should open the full category modal', async () => {
    configure();
    await fixture.whenStable();
    const moreBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.catnav-pills__item--more');
    moreBtn.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.catnav-modal')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Todas las categorías');
  });

  it('should filter categories in the modal', async () => {
    configure();
    await fixture.whenStable();
    const moreBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.catnav-pills__item--more');
    moreBtn.click();
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#cat-search');
    input.value = 'aceites';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    const modalText = fixture.nativeElement.querySelector('.catnav-modal').textContent ?? '';
    expect(modalText).toContain('Aceites Esenciales');
    expect(modalText).not.toContain('Bebidas');
  });

  it('should emit categorySelected from modal and close', async () => {
    configure();
    await fixture.whenStable();
    const spy = vi.fn();
    component.categorySelected.subscribe(spy);
    const moreBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.catnav-pills__item--more');
    moreBtn.click();
    await fixture.whenStable();
    const cards: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.catnav-modal__card');
    const bebidas = Array.from(cards).find((c) => c.textContent?.includes('Bebidas'));
    bebidas?.click();
    await fixture.whenStable();
    expect(spy).toHaveBeenCalledWith(2);
    expect(fixture.nativeElement.querySelector('.catnav-modal')).toBeFalsy();
  });

  it('should close modal when clicking the overlay', async () => {
    configure();
    await fixture.whenStable();
    const moreBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.catnav-pills__item--more');
    moreBtn.click();
    await fixture.whenStable();
    const overlay: HTMLElement = fixture.nativeElement.querySelector('.catnav-overlay');
    overlay.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.catnav-modal')).toBeFalsy();
  });

  it('should highlight selected category in quick pills', async () => {
    configure();
    fixture.componentRef.setInput('selectedCategoryId', 7);
    fixture.detectChanges();
    await fixture.whenStable();
    const active = fixture.nativeElement.querySelector('.catnav-pills__item--active');
    expect(active.textContent).toContain('Hierbas');
  });

  it('should render a mobile category button', async () => {
    configure();
    await fixture.whenStable();
    const btn = fixture.nativeElement.querySelector('.catnav-mobile');
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('Todas las categorías');
  });

  it('should show selected category name on mobile button', async () => {
    configure();
    fixture.componentRef.setInput('selectedCategoryId', 7);
    fixture.detectChanges();
    await fixture.whenStable();
    const btn = fixture.nativeElement.querySelector('.catnav-mobile');
    expect(btn.textContent).toContain('Hierbas');
  });

  it('should show selected non-quick category in the pill row', async () => {
    TestBed.configureTestingModule({ imports: [CategoryNav] });
    fixture = TestBed.createComponent(CategoryNav);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('categories', CATEGORIES);
    fixture.componentRef.setInput('selectedCategoryId', 8); // Panaderia, not in top 6
    fixture.detectChanges();
    await fixture.whenStable();

    // Verify computed works at component level
    const selected = (component as any).selectedCategory();
    expect(selected).toBeTruthy();
    expect(selected.id).toBe(8);

    const display = (component as any).displayCategories();
    const displayIds = display.map((c: any) => c.id);
    expect(displayIds).toContain(8);

    // Now verify DOM
    const pills: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.catnav-pills__item'));
    expect(pills.length).toBe(display.length + 2); // +2 for Todas + Todas las categorías
    const activePill = pills.find((p) => p.classList.contains('catnav-pills__item--active') && p.textContent?.includes('Panaderia'));
    expect(activePill).toBeTruthy();
  });

  it('should open panel from mobile button', async () => {
    configure();
    await fixture.whenStable();
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.catnav-mobile');
    btn.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.catnav-modal')).toBeTruthy();
  });
});

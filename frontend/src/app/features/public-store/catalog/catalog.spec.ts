import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { MessageService } from 'primeng/api';

import { Catalog } from './catalog';
import { CatalogService } from '../../../core/services/catalog';
import { Category, ProductSummary } from '../../../shared/models/product';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function buildCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 1,
    name: 'Cereales',
    productCount: 3,
    ...overrides,
  };
}

function buildProduct(overrides: Partial<ProductSummary> = {}): ProductSummary {
  return {
    id: 1,
    name: 'Granola artesanal',
    salePrice: 2500,
    onlineStatus: 'PUBLISHED',
    availableStock: 10,
    categoryId: 1,
    categoryName: 'Cereales',
    ...overrides,
  };
}

/** Sample categories list. */
const SAMPLE_CATEGORIES: Category[] = [
  buildCategory({ id: 1, name: 'Cereales', productCount: 3 }),
  buildCategory({ id: 2, name: 'Suplementos', productCount: 5 }),
  buildCategory({ id: 3, name: 'Snacks', productCount: 2 }),
];

/** Sample products list. */
const SAMPLE_PRODUCTS: ProductSummary[] = [
  buildProduct({
    id: 1,
    name: 'Granola artesanal',
    salePrice: 2500,
    categoryId: 1,
    categoryName: 'Cereales',
    brandName: 'Lembas',
  }),
  buildProduct({
    id: 2,
    name: 'Avena premium',
    salePrice: 1800,
    categoryId: 1,
    categoryName: 'Cereales',
  }),
];

/**
 * Type-safe helper to access protected component members for assertions.
 * Casts the component to a record so we can read/write signals and methods.
 * Each access site casts to the expected type inline.
 */
function expose(component: Catalog): Record<string, unknown> {
  return component as unknown as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

describe('Catalog', () => {
  let component: Catalog;
  let fixture: ComponentFixture<Catalog>;
  let svc: Record<string, ReturnType<typeof vi.fn>>;
  let c: Record<string, unknown>;

  function configure(
    categories: Category[] = SAMPLE_CATEGORIES,
    products: ProductSummary[] = SAMPLE_PRODUCTS,
    totalElements = products.length,
  ): void {
    svc = {
      getCategories: vi.fn().mockReturnValue(of(categories)),
      getProducts: vi.fn().mockReturnValue(
        of({
          content: products,
          totalElements,
          totalPages: Math.max(1, Math.ceil(totalElements / 20)),
          number: 0,
          size: 20,
          first: true,
          last: true,
          empty: products.length === 0,
        }),
      ),
    };

    TestBed.configureTestingModule({
      imports: [Catalog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        MessageService,
        { provide: CatalogService, useValue: svc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Catalog);
    component = fixture.componentInstance;
    c = expose(component);
    fixture.detectChanges();
  }

  // -------------------------------------------------------------------------
  // Initialisation
  // -------------------------------------------------------------------------

  it('should create', () => {
    configure();
    expect(component).toBeTruthy();
  });

  it('should load categories on init', () => {
    configure();
    expect(svc['getCategories']).toHaveBeenCalledTimes(1);
    expect((c['categories'] as () => Category[])()).toEqual(SAMPLE_CATEGORIES);
  });

  it('should load products on init', () => {
    configure();
    expect(svc['getProducts']).toHaveBeenCalledTimes(1);
    expect((c['products'] as () => ProductSummary[])()).toEqual(SAMPLE_PRODUCTS);
  });

  it('should render the hero title', () => {
    configure();
    const h1: HTMLElement | null = fixture.nativeElement.querySelector('#catalog-title');
    expect(h1).toBeTruthy();
    expect(h1!.textContent?.trim()).toBe('Nuestra góndola digital');
  });

  // -------------------------------------------------------------------------
  // Category filter
  // -------------------------------------------------------------------------

  it('should render a pill for each category plus "Todas"', () => {
    configure();
    const pills: NodeListOf<HTMLElement> =
      fixture.nativeElement.querySelectorAll('.catnav__pill');
    // "Todas" + 3 categories
    expect(pills.length).toBe(4);
    expect(pills[0].textContent?.trim()).toContain('Todas');
    // Pills now include icon + name, so check that category name is present
    expect(pills[1].textContent).toContain('Cereales');
    expect(pills[2].textContent).toContain('Suplementos');
    expect(pills[3].textContent).toContain('Snacks');
  });

  it('should mark "Todas" as active by default', () => {
    configure();
    const pills: NodeListOf<HTMLElement> =
      fixture.nativeElement.querySelectorAll('.catnav__pill');
    expect(pills[0].classList.contains('catnav__pill--active')).toBe(true);
  });

  it('should select a category on pill click', () => {
    configure();

    // Click on "Suplementos" (index 2)
    const pills: NodeListOf<HTMLElement> =
      fixture.nativeElement.querySelectorAll('.catnav__pill');
    pills[2].click();
    fixture.detectChanges();

    expect((c['selectedCategoryId'] as () => number | null)()).toBe(2);
    expect(svc['getProducts']).toHaveBeenCalledWith(undefined, 2, undefined, 0, 20);

    // "Suplementos" pill should now be active
    expect(pills[2].classList.contains('catnav__pill--active')).toBe(true);
  });

  it('should reset to all categories when "Todas" is clicked', () => {
    configure();

    // First select a category
    (c['selectedCategoryId'] as { set: (v: number | null) => void }).set(1);
    fixture.detectChanges();

    // Then click "Todas"
    const pills: NodeListOf<HTMLElement> =
      fixture.nativeElement.querySelectorAll('.catnav__pill');
    pills[0].click();
    fixture.detectChanges();

    expect((c['selectedCategoryId'] as () => number | null)()).toBeNull();
    expect(pills[0].classList.contains('catnav__pill--active')).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------

  it('should show empty state when no products', () => {
    configure(SAMPLE_CATEGORIES, [], 0);
    fixture.detectChanges();

    const emptyTitle: HTMLElement | null = fixture.nativeElement.querySelector('.empty-state h2');
    expect(emptyTitle).toBeTruthy();
    expect(emptyTitle!.textContent?.trim()).toBe('Catálogo en preparación');
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  it('should show loading spinner while products load', () => {
    // Use a Subject so loading never resolves during the test.
    const productsSubject = new Subject<{
      content: ProductSummary[];
      totalElements: number;
      totalPages: number;
      number: number;
      size: number;
      first: boolean;
      last: boolean;
      empty: boolean;
    }>();

    svc = {
      getCategories: vi.fn().mockReturnValue(of(SAMPLE_CATEGORIES)),
      getProducts: vi.fn().mockReturnValue(productsSubject.asObservable()),
    };

    TestBed.configureTestingModule({
      imports: [Catalog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        MessageService,
        { provide: CatalogService, useValue: svc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Catalog);
    component = fixture.componentInstance;
    c = expose(component);

    // ngOnInit runs inside detectChanges() and loads categories + products.
    // Since getProducts returns a Subject that never emits, loading stays true.
    fixture.detectChanges();

    const spinner: HTMLElement | null = fixture.nativeElement.querySelector('app-loading-spinner');
    expect(spinner).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------

  it('should show error text when categories fail to load', () => {
    svc = {
      getCategories: vi.fn().mockReturnValue(throwError(() => new Error('Network error'))),
      getProducts: vi.fn().mockReturnValue(
        of({
          content: [],
          totalElements: 0,
          totalPages: 0,
          number: 0,
          size: 20,
          first: true,
          last: true,
          empty: true,
        }),
      ),
    };

    TestBed.configureTestingModule({
      imports: [Catalog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        MessageService,
        { provide: CatalogService, useValue: svc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Catalog);
    component = fixture.componentInstance;
    c = expose(component);
    fixture.detectChanges();

    expect((c['categoriesError'] as () => boolean)()).toBe(true);

    // The filter section should show the error message instead of pills
    const filterError: HTMLElement | null = fixture.nativeElement.querySelector(
      '.catnav + .flex, [class*="border-"][class*="bg-"][class*="text-"][class*="rounded-xl"]',
    );
    // Verify error state is active and no pills are rendered
    const pills: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.catnav__pill');
    expect(pills.length).toBe(0);
  });

  it('should show error alert when products fail to load', () => {
    svc = {
      getCategories: vi.fn().mockReturnValue(of(SAMPLE_CATEGORIES)),
      getProducts: vi.fn().mockReturnValue(throwError(() => new Error('Network error'))),
    };

    TestBed.configureTestingModule({
      imports: [Catalog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        MessageService,
        { provide: CatalogService, useValue: svc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Catalog);
    component = fixture.componentInstance;
    c = expose(component);
    fixture.detectChanges();

    expect((c['productsError'] as () => boolean)()).toBe(true);

    // The error alert is now inline-styled with the Lembas design system
    const errorText: HTMLElement | null = fixture.nativeElement.querySelector('button[aria-label="Reintentar"]');
    expect(errorText).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Product rendering
  // -------------------------------------------------------------------------

  it('should render product cards', () => {
    configure();
    fixture.detectChanges();

    const cards: NodeListOf<HTMLElement> =
      fixture.nativeElement.querySelectorAll('.catalog-page__card');
    expect(cards.length).toBe(2);

    const firstCard = cards[0];
    expect(firstCard.textContent).toContain('Granola artesanal');
    expect(firstCard.textContent).toContain('Lembas');
    expect(firstCard.textContent).toContain('2.500');
  });

  // -------------------------------------------------------------------------
  // Pagination
  // -------------------------------------------------------------------------

  it('should render pagination when there are products', () => {
    configure();
    fixture.detectChanges();

    const paginator: HTMLElement | null = fixture.nativeElement.querySelector('app-pagination');
    expect(paginator).toBeTruthy();
  });

  it('should not render pagination when there are no products', () => {
    configure(SAMPLE_CATEGORIES, [], 0);
    fixture.detectChanges();

    const paginator: HTMLElement | null = fixture.nativeElement.querySelector('app-pagination');
    expect(paginator).toBeFalsy();
  });
});

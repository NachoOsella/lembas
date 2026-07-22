import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { CatalogService } from '@features/catalog/data-access/catalog';
import { StoreBranchSelectionService } from '@features/branches/public-api';
import type { ProductSummary } from '@features/catalog/domain/product';
import { Home } from './home';

/** Builds a published product used by the home recommendations tests. */
function buildProduct(overrides: Partial<ProductSummary> = {}): ProductSummary {
  return {
    id: 1,
    name: 'Granola artesanal',
    salePrice: 2500,
    onlineStatus: 'PUBLISHED',
    categoryId: 1,
    categoryName: 'Cereales',
    ...overrides,
  };
}

/** Type-safe helper for reading protected signals in tests. */
function expose(component: Home): Record<string, unknown> {
  return component as unknown as Record<string, unknown>;
}

describe('Home', () => {
  let fixture: ComponentFixture<Home>;
  let component: Home;
  let catalogService: { getFeaturedProducts: ReturnType<typeof vi.fn> };

  /** Configures TestBed with a mocked public catalog service. */
  async function configure(products: ProductSummary[] = [buildProduct()]): Promise<void> {
    catalogService = {
      getFeaturedProducts: vi.fn().mockReturnValue(
        of({
          content: products,
          totalElements: products.length,
          totalPages: 1,
          number: 0,
          size: 15,
          first: true,
          last: true,
          empty: products.length === 0,
        }),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        { provide: CatalogService, useValue: catalogService },
        { provide: StoreBranchSelectionService, useValue: { selectedBranchId: signal(null) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and render the hero content', async () => {
    await configure();

    expect(component).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Tu despensa natural, lista para retirar');
    expect(fixture.nativeElement.textContent).toContain('Ver catálogo completo');
  });

  it('should load featured products on init', async () => {
    const products = [buildProduct({ id: 1 }), buildProduct({ id: 2, name: 'Avena premium' })];

    await configure(products);

    expect(catalogService.getFeaturedProducts).toHaveBeenCalledTimes(1);
    expect((expose(component)['featuredProducts'] as () => ProductSummary[])()).toEqual(products);
    expect((expose(component)['featuredLoading'] as () => boolean)()).toBe(false);
  });

  it('should keep the latest featured request when the branch changes quickly', async () => {
    const firstResponse = new Subject<{
      content: ProductSummary[];
      totalElements: number;
      totalPages: number;
      number: number;
      size: number;
      first: boolean;
      last: boolean;
      empty: boolean;
    }>();
    const secondResponse = new Subject<typeof firstResponse extends Subject<infer T> ? T : never>();
    const branchId = signal<number | null>(null);
    catalogService = {
      getFeaturedProducts: vi
        .fn()
        .mockReturnValueOnce(firstResponse.asObservable())
        .mockReturnValueOnce(secondResponse.asObservable()),
    };

    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        { provide: CatalogService, useValue: catalogService },
        { provide: StoreBranchSelectionService, useValue: { selectedBranchId: branchId } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    branchId.set(1);
    fixture.detectChanges();

    firstResponse.next({
      content: [buildProduct({ name: 'Respuesta vieja' })],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 15,
      first: true,
      last: true,
      empty: false,
    });
    secondResponse.next({
      content: [buildProduct({ name: 'Respuesta vigente' })],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 15,
      first: true,
      last: true,
      empty: false,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Respuesta vigente');
    expect(fixture.nativeElement.textContent).not.toContain('Respuesta vieja');
  });

  it('should stop loading when featured products fail', async () => {
    catalogService = {
      getFeaturedProducts: vi.fn().mockReturnValue(throwError(() => new Error('Network error'))),
    };

    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        { provide: CatalogService, useValue: catalogService },
        { provide: StoreBranchSelectionService, useValue: { selectedBranchId: signal(null) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect((expose(component)['featuredLoading'] as () => boolean)()).toBe(false);
    expect((expose(component)['featuredProducts'] as () => ProductSummary[])()).toEqual([]);
  });
});

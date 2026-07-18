import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { PosProductSearchComponent } from './pos-product-search';
import { PosCartStore } from '../../state/pos-cart.store';
import type { PosProductSearchItem } from '../../services/pos-product-search.service';
import { PosProductSearchService } from '../../services/pos-product-search.service';

/** Sample row returned by the backend. */
const SAMPLE: PosProductSearchItem = {
  id: 1,
  name: 'Aceite de oliva 500ml',
  brandName: 'Lembas',
  barcode: '7501234567890',
  salePrice: 2500,
  availableStock: 12,
  imageUrl: null,
};

/** Out-of-stock sample. */
const OUT_OF_STOCK: PosProductSearchItem = {
  ...SAMPLE,
  id: 2,
  name: 'Yerba 1kg',
  barcode: '7790001',
  availableStock: 0,
};

/** Unit tests for {@link PosProductSearchComponent}. */
describe('PosProductSearchComponent', () => {
  let fixture: ComponentFixture<PosProductSearchComponent>;
  let component: PosProductSearchComponent;
  let httpMock: HttpTestingController;
  let cart: PosCartStore;

  async function createComponent(): Promise<void> {
    TestBed.configureTestingModule({
      imports: [PosProductSearchComponent],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        PosCartStore,
        PosProductSearchService,
      ],
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(PosProductSearchComponent);
    component = fixture.componentInstance;
    cart = TestBed.inject(PosCartStore);
    fixture.detectChanges();
    httpMock = TestBed.inject(HttpTestingController);
  }

  function typeInInput(value: string): void {
    component.query.setValue(value);
    fixture.detectChanges();
  }

  function flushQuery(q: string, body: PosProductSearchItem[]): void {
    const req = httpMock.expectOne(
      (r) => r.url === '/api/pos/products/search' && r.params.get('q') === q,
    );
    expect(req.request.params.get('q')).toBe(q);
    req.flush(body);
  }

  it('should create the component', async () => {
    await createComponent();
    expect(component).toBeTruthy();
  });

  it('forwards the branchId input to the search service as a query param', async () => {
    await createComponent();
    fixture.componentRef.setInput('branchId', 7);
    typeInInput('ace');
    await new Promise((resolve) => setTimeout(resolve, 250));
    const req = httpMock.expectOne(
      (r) => r.url === '/api/pos/products/search' && r.params.get('branchId') === '7',
    );
    req.flush([]);
  });

  it('re-fetches the current search when branchId changes', async () => {
    await createComponent();
    typeInInput('ace');
    await new Promise((resolve) => setTimeout(resolve, 250));
    flushQuery('ace', []);
    expect(component.results()).toEqual([]);

    // Change the branch. The current search should re-run with the new id
    // after the debounce window (200ms).
    fixture.componentRef.setInput('branchId', 9);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const refetch = httpMock.expectOne(
      (r) => r.url === '/api/pos/products/search' && r.params.get('branchId') === '9',
    );
    expect(refetch.request.params.get('q')).toBe('ace');
    refetch.flush([]);
  });

  it('autofocuses the search input on init', async () => {
    await createComponent();
    // queueMicrotask was used to schedule the focus; wait one tick.
    await Promise.resolve();
    const input = fixture.nativeElement.querySelector(
      '[data-testid="pos-search-input"]',
    ) as HTMLInputElement | null;
    expect(input).toBeTruthy();
    expect(document.activeElement).toBe(input);
  });

  it('does not hit the backend when the query is blank', async () => {
    await createComponent();
    typeInInput('');
    fixture.detectChanges();
    httpMock.expectNone(() => true);
    expect(component.results()).toEqual([]);
  });

  it('runs a debounced text search and renders the result cards', async () => {
    await createComponent();
    typeInInput('ace');

    // Initial 200ms debounce window.
    await new Promise((resolve) => setTimeout(resolve, 250));
    flushQuery('ace', [SAMPLE]);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('app-pos-product-card');
    expect(cards).toHaveLength(1);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Aceite de oliva 500ml');
  });

  it('shows the empty state when the backend returns no rows', async () => {
    await createComponent();
    typeInInput('zzz');
    await new Promise((resolve) => setTimeout(resolve, 250));
    flushQuery('zzz', []);
    fixture.detectChanges();

    const empty = fixture.nativeElement.querySelector('[data-testid="empty-state"]');
    expect(empty).toBeTruthy();
  });

  it('surfaces a user-facing error when the backend fails', async () => {
    await createComponent();
    typeInInput('ace');
    await new Promise((resolve) => setTimeout(resolve, 250));
    httpMock
      .expectOne((r) => r.url === '/api/pos/products/search')
      .flush('boom', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    const err = fixture.nativeElement.querySelector('[data-testid="search-error"]');
    expect(err).toBeTruthy();
  });

  it('treats a 6+ digit query as a barcode and shows the "Modo barcode" hint', async () => {
    await createComponent();
    typeInInput('750123');
    fixture.detectChanges();

    const hint = fixture.nativeElement.querySelector('[data-testid="barcode-mode"]');
    expect(hint).toBeTruthy();
  });

  it('does not treat a short numeric query as a barcode', async () => {
    await createComponent();
    typeInInput('12345');
    fixture.detectChanges();

    const hint = fixture.nativeElement.querySelector('[data-testid="barcode-mode"]');
    expect(hint).toBeFalsy();
  });

  it('adds the selected product to the cart and clears the input', async () => {
    await createComponent();
    typeInInput('ace');
    await new Promise((resolve) => setTimeout(resolve, 250));
    flushQuery('ace', [SAMPLE]);
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector(
      'app-pos-product-card button',
    ) as HTMLButtonElement;
    card.click();
    fixture.detectChanges();

    const lines = cart.lines();
    expect(lines).toHaveLength(1);
    expect(lines[0].productId).toBe(1);
    expect(component.query.value).toBe('');
    expect(component.results()).toEqual([]);
  });

  it('does not add an out-of-stock item to the cart', async () => {
    await createComponent();
    typeInInput('yerba');
    await new Promise((resolve) => setTimeout(resolve, 250));
    flushQuery('yerba', [OUT_OF_STOCK]);
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector(
      'app-pos-product-card button',
    ) as HTMLButtonElement;
    card.click();
    fixture.detectChanges();

    expect(cart.lines()).toEqual([]);
  });

  it('triggers an immediate search on Enter without waiting for the debounce', async () => {
    await createComponent();
    typeInInput('ace');

    component.onEnter();
    await new Promise((resolve) => setTimeout(resolve, 0));
    flushQuery('ace', [SAMPLE]);
    fixture.detectChanges();

    expect(component.results()).toHaveLength(1);
  });

  it('keeps only the latest search response when requests overlap', async () => {
    await createComponent();
    typeInInput('ace');
    await new Promise((resolve) => setTimeout(resolve, 250));
    const firstRequest = httpMock.expectOne(
      (request) => request.url === '/api/pos/products/search' && request.params.get('q') === 'ace',
    );

    typeInInput('yerba');
    await new Promise((resolve) => setTimeout(resolve, 250));
    const secondRequest = httpMock.expectOne(
      (request) =>
        request.url === '/api/pos/products/search' && request.params.get('q') === 'yerba',
    );
    secondRequest.flush([OUT_OF_STOCK]);
    fixture.detectChanges();

    expect(component.results()).toEqual([OUT_OF_STOCK]);
    expect(firstRequest.cancelled).toBe(true);
    expect(component.results()).toEqual([OUT_OF_STOCK]);
  });
});

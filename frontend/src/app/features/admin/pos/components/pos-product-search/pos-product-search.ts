import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { InputText } from 'primeng/inputtext';

import { ErrorAlert } from '../../../../../shared/components/error-alert/error-alert';
import { LoadingSpinner } from '../../../../../shared/components/loading-spinner/loading-spinner';
import { AppSectionCard } from '../../../../../shared/components/app-section-card/app-section-card';

import {
  PosProductSearchItem,
  PosProductSearchService,
} from '../../services/pos-product-search.service';
import { PosCartStore } from '../../state/pos-cart.store';
import { PosProductCardComponent } from '../pos-product-card/pos-product-card';

/** Debounce applied to text-driven searches (ms). */
const SEARCH_DEBOUNCE_MS = 200;

/** Minimum length to consider an input as a barcode-shaped query. */
const BARCODE_MIN_DIGITS = 6;

/**
 * POS product search component.
 *
 * <p>Single-input search box optimised for both free text (product name /
 * partial barcode) and barcode scanners (HID keyboard + Enter). The input
 * is auto-focused on load and after every selection so the cashier never
 * has to touch the mouse between scans.</p>
 */
@Component({
  selector: 'app-pos-product-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    InputText,
    ErrorAlert,
    LoadingSpinner,
    AppSectionCard,
    PosProductCardComponent,
  ],
  templateUrl: './pos-product-search.html',
  styleUrl: './pos-product-search.css',
})
export class PosProductSearchComponent implements OnInit {
  private readonly searchService = inject(PosProductSearchService);
  private readonly cart = inject(PosCartStore);
  private readonly destroyRef = inject(DestroyRef);

  /** Reference to the search input for autofocus and refocus. */
  private readonly inputRef =
    viewChild<ElementRef<HTMLInputElement>>('queryInput');

  /** Two-way bound search query. */
  readonly query = new FormControl<string>('', { nonNullable: true });

  /**
   * Signal mirror of the FormControl value, used to drive computed signals
   * (Angular signals only re-evaluate when a signal dependency changes; reading
   * {@code query.value} inside a computed would not be reactive).
   */
  private readonly querySignal = toSignal(this.query.valueChanges, {
    initialValue: this.query.value,
  });

  /** Search results. */
  readonly results = signal<PosProductSearchItem[]>([]);

  /** True while a search is in flight. */
  readonly loading = signal(false);

  /** Last user-facing error message, or null. */
  readonly errorMessage = signal<string | null>(null);

  /**
   * Branch used to resolve available stock.
   *
   * <p>For S3-US09 the branch is resolved from the active cash session
   * once LEMBAS-52 lands. Until then the component is rendered with a
   * null branch; the UI shows "stock: —" on every row.</p>
   */
  readonly branchId = signal<number | null>(null);

  /** Heuristic: true when the query is numeric and 6+ digits (barcode). */
  readonly isLikelyBarcode = computed(() =>
    /^\d{6,}$/.test((this.querySignal() ?? '').trim()),
  );

  /** True when a search was triggered and no result was returned. */
  readonly hasNoResults = computed(
    () =>
      !this.loading() &&
      this.results().length === 0 &&
      (this.querySignal() ?? '').trim().length > 0,
  );

  private readonly searchTrigger$ = new Subject<string>();

  ngOnInit(): void {
    // Auto-focus the search input on load so a barcode scanner can start
    // firing reads immediately.
    queueMicrotask(() => this.inputRef()?.nativeElement.focus());

    // Wire the debounced search pipeline.
    this.query.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.searchTrigger$.next(value ?? ''));

    this.searchTrigger$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((q) => this.runSearch(q));
  }

  /** Enter key handler — executes the search immediately, bypassing debounce. */
  onEnter(): void {
    const q = (this.query.value ?? '').trim();
    if (!q) {
      return;
    }
    this.runSearch(q);
  }

  /**
   * Adds the selected product to the cart and clears the search input so
   * the next scan is ready without leaving the keyboard.
   */
  onSelect(item: PosProductSearchItem): void {
    if (this.isOutOfStock(item)) {
      return;
    }
    this.cart.addItem({
      productId: item.id,
      name: item.name,
      unitPrice: item.salePrice,
    });
    this.query.setValue('');
    this.results.set([]);
    this.errorMessage.set(null);
    queueMicrotask(() => this.inputRef()?.nativeElement.focus());
  }

  /** True when the product is reported as out of stock. */
  isOutOfStock(item: PosProductSearchItem): boolean {
    return item.availableStock != null && item.availableStock <= 0;
  }

  /** True if the input is a numeric barcode-shaped string. */
  protected isBarcodeHeuristic(): boolean {
    return this.isLikelyBarcode();
  }

  private runSearch(q: string): void {
    const trimmed = q.trim();
    if (!trimmed) {
      this.results.set([]);
      this.errorMessage.set(null);
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    this.searchService.search(trimmed, this.branchId()).subscribe({
      next: (items) => {
        this.results.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo buscar. Reintentá.');
        this.loading.set(false);
      },
    });
  }
}

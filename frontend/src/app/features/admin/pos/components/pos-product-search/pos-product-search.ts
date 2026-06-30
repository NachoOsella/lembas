import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  effect,
  inject,
  input,
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

/** Combined key for the search pipeline (query + branch id). */
interface SearchKey {
  readonly query: string;
  readonly branchId: number | null;
}

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
   * Branch id used to resolve per-product available stock.
   *
   * <p>Bound by the parent page from the active cash session. When null
   * (e.g. no session is open yet) the backend reports stock as null and
   * the cards render a neutral "Verificar" badge.</p>
   */
  readonly branchId = input<number | null>(null);

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

  /**
   * Unified search trigger fed by both the query input and the branch id.
   * Using a combined key lets {@code distinctUntilChanged} drop duplicates
   * when both fire in quick succession (e.g. typing a query while the
   * branch signal is settling on construction or after a tab visibility
   * change).
   */
  private readonly searchTrigger$ = new Subject<SearchKey>();

  /**
   * Effect that pushes the current (query, branchId) into the trigger
   * whenever the branch input changes. Set up as a field initializer so
   * Angular can register it in injection context.
   */
  private readonly branchIdEffect = effect(() => {
    const branchId = this.branchId();
    this.searchTrigger$.next({
      query: this.query.value ?? '',
      branchId,
    });
  });

  ngOnInit(): void {
    // Auto-focus the search input on load so a barcode scanner can start
    // firing reads immediately.
    queueMicrotask(() => this.inputRef()?.nativeElement.focus());

    // Query-driven side of the same trigger.
    this.query.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) =>
        this.searchTrigger$.next({
          query: value ?? '',
          branchId: this.branchId(),
        }),
      );

    this.searchTrigger$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged((a, b) => a.query === b.query && a.branchId === b.branchId),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ query, branchId }) => this.runSearch(query, branchId));
  }

  /** Enter key handler — executes the search immediately, bypassing debounce. */
  onEnter(): void {
    const q = (this.query.value ?? '').trim();
    if (!q) {
      return;
    }
    this.runSearch(q, this.branchId());
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

  private runSearch(rawQuery: string, branchId: number | null): void {
    const trimmed = rawQuery.trim();
    if (!trimmed) {
      this.results.set([]);
      this.errorMessage.set(null);
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    this.searchService.search(trimmed, branchId).subscribe({
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

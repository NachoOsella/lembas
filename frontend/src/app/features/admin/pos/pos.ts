import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../../core/services/auth';
import { ErrorMappingService } from '../../../core/services/error-mapping';
import { UserService } from '../../../core/services/user';
import { getApiError } from '../../../shared/models/api-error';
import { Branch } from '../../../shared/models/user';
import { OrderDetail } from '../../../shared/models/order';
import { CashSessionDto } from '../../../shared/models/cash-session';

import { CashService } from '../../../core/services/cash';

import { AppBadge } from '../../../shared/components/app-badge/app-badge';
import { AppButton } from '../../../shared/components/app-button/app-button';
import { AppControlField } from '../../../shared/components/app-control-field/app-control-field';
import { AppPageHeader } from '../../../shared/components/app-page-header/app-page-header';
import { AppSelect } from '../../../shared/components/app-select/app-select';
import { AppToast } from '../../../shared/components/app-toast/app-toast';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';

import { PosCartComponent } from './components/pos-cart/pos-cart';
import { PosCheckoutResultDialogComponent } from './components/pos-checkout-result-dialog/pos-checkout-result-dialog';
import { PosProductSearchComponent } from './components/pos-product-search/pos-product-search';
import { PosCartStore } from './state/pos-cart.store';
import {
  CreatePosSaleRequest,
  PosSaleService,
} from './services/pos-sale.service';

interface BranchOption {
  readonly label: string;
  readonly value: number;
}

/**
 * POS landing page (S3-US09, S3-US10, S3-US11).
 *
 * <p>Two-panel layout: product search on the left, cart + payment selector
 * + "Cobrar" action on the right. Probes the current cash session on load
 * to surface a clear warning when the cashier has no OPEN register;
 * a "Cobrar" action is also gated on the cart not being empty.</p>
 *
 * <p>ADMIN users are shown a branch selector at the top so they can choose
 * which branch to operate on, since they have no assigned branch. MANAGER
 * and EMPLOYEE always use their assigned branch.</p>
 *
 * <p>F8 is wired as a global quick-checkout shortcut, only active when the
 * page is in a chargeable state (cart not empty AND cash session open).</p>
 */
@Component({
  selector: 'app-pos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    AppBadge,
    AppButton,
    AppControlField,
    AppPageHeader,
    AppSelect,
    AppToast,
    LoadingSpinner,
    PosCartComponent,
    PosCheckoutResultDialogComponent,
    PosProductSearchComponent,
  ],
  templateUrl: './pos.html',
  styleUrl: './pos.css',
})
export class AdminPosPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly cart = inject(PosCartStore);
  private readonly posSale = inject(PosSaleService);
  private readonly cash = inject(CashService);
  private readonly userService = inject(UserService);
  private readonly errorMapping = inject(ErrorMappingService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly cartLines = this.cart.lines;
  protected readonly hasItems = computed(() => this.cartLines().length > 0);

  protected readonly cashSession = signal<CashSessionDto | null>(null);
  protected readonly cashSessionLoading = signal(true);
  protected readonly processing = signal(false);
  protected readonly lastResult = signal<OrderDetail | null>(null);

  /** ADMIN-specific branch selection state. */
  protected readonly isAdmin = computed(() => this.auth.getUserRole() === 'ADMIN');
  protected readonly branches = signal<Branch[]>([]);
  protected readonly branchId = signal<number | null>(null);
  protected readonly loadingBranches = signal(false);

  protected readonly branchOptions = computed<BranchOption[]>(() =>
    this.branches().map((b) => ({ label: b.name, value: b.id })),
  );

  /**
   * The branch id to use for cash session lookups and POS sale requests.
   * For ADMIN: the user-selected branch; for MANAGER/EMPLOYEE: their assigned branch.
   */
  protected readonly resolvedBranchIdForSession = computed<number | null>(() => {
    if (this.isAdmin()) {
      return this.branchId();
    }
    return this.auth.currentUser()?.branchId ?? null;
  });

  /**
   * Whether the cashier can charge right now. Requires: items in the cart
   * AND an open cash session resolved.
   */
  protected readonly canCheckout = computed(
    () => this.hasItems() && this.cashSession() != null,
  );

  /** Reference to the cart panel so the page can read its selection state. */
  private readonly cartComponent = viewChild<PosCartComponent>('cartComponent');

  ngOnInit(): void {
    this.initializeBranch();
  }

  /** Resolves the branch to use, then loads the cash session. */
  private initializeBranch(): void {
    const user = this.auth.currentUser();
    if (!user || user.role === 'CUSTOMER') {
      void this.router.navigate(['/admin']);
      return;
    }

    if (this.isAdmin()) {
      this.loadBranches();
      return;
    }

    // MANAGER / EMPLOYEE: use assigned branch, skip loading branches.
    this.refreshCashSession();
  }

  /** Loads active branches for the ADMIN branch selector. */
  private loadBranches(): void {
    this.loadingBranches.set(true);
    this.userService.listBranches().subscribe({
      next: (branches) => {
        this.branches.set(branches);
        this.loadingBranches.set(false);
        // Auto-select when only one branch exists.
        if (branches.length === 1) {
          this.branchId.set(branches[0].id);
        }
        // Load the cash session (will pass the selected branchId).
        this.refreshCashSession();
      },
      error: () => {
        this.loadingBranches.set(false);
        this.cashSessionLoading.set(false);
      },
    });
  }

  /**
   * Triggered when ADMIN selects a branch from the dropdown.
   * Re-probes the cash session for the newly selected branch.
   */
  protected onBranchSelected(value: number | null): void {
    this.branchId.set(value);
    if (value != null) {
      this.refreshCashSession();
    }
  }

  /**
   * Re-probes the current cash session.
   *
   * <p>Invoked on three occasions:</p>
   * <ol>
   *   <li>Page load ({@code ngOnInit}) — initial badge state.</li>
   *   <li>Tab visibility change — when the cashier returns to this tab the
   *       session may have been opened or closed in another tab, so we
   *       refresh to keep the badge and the {@code canCheckout} gate in
   *       sync with the backend.</li>
   *   <li>Checkout failure with {@code CASH_SESSION_NOT_FOUND} — auto-sync
   *       the UI after a stale cache produced a 404.</li>
   * </ol>
   */
  refreshCashSession(): void {
    this.loadCashSession();
  }

  /**
   * F8 triggers a checkout when the page is in a chargeable state.
   *
   * <p>Re-probes the cash session first to avoid firing a doomed POST when
   * the cache is stale (e.g. the cashier closed the session in another
   * tab). If the re-probe confirms no session, the canCheckout gate flips
   * to false and the call short-circuits before the HTTP request.</p>
   */
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'F8') {
      return;
    }
    if (this.processing()) {
      return;
    }
    event.preventDefault();
    this.refreshCashSession();
    this.onCheckout();
  }

  /**
   * When the tab regains focus (e.g. the cashier opened or closed a
   * session in another window) we re-probe the session to keep the
   * badge and the canCheckout gate in sync. Cheap (one GET) and prevents
   * the stale-cache race that produced the
   * "No se pudo cobrar / Sin caja abierta" toast.
   */
  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (typeof document === 'undefined' || document.visibilityState !== 'visible') {
      return;
    }
    this.refreshCashSession();
  }

  /** Called by the cart component's "Cobrar" button or the F8 shortcut. */
  onCheckout(): void {
    if (!this.canCheckout() || this.processing()) {
      return;
    }
    const cart = this.cartComponent();
    if (!cart) {
      return;
    }
    const { paymentMethod, cashReceived } = cart.getSelection();
    if (!paymentMethod) {
      return;
    }
    const lines = this.cartLines();
    const branchId = this.resolvedBranchIdForSession();

    this.processing.set(true);
    const request: CreatePosSaleRequest = {
      items: lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
      })),
      paymentMethod,
      cashReceived,
      notes: null,
      // ADMIN passes branchId so the backend knows which branch to sell at.
      branchId: this.isAdmin() ? branchId : null,
    };

    this.posSale.createSale(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (order) => {
        this.processing.set(false);
        this.lastResult.set(order);
        this.cart.clear();
        cart.resetSelection();
        this.messageService.add({
          severity: 'success',
          summary: 'Venta registrada',
          detail: `Orden ${order.orderNumber} - ${this.formatMoney(order.total)}`,
          life: 4000,
        });
      },
      error: (err) => {
        this.processing.set(false);
        const apiError = getApiError(err);
        const code = apiError?.code ?? 'INTERNAL_ERROR';
        const message = this.errorMapping.getMessage(
          code,
          'No se pudo registrar la venta. Reintentá.',
        );
        this.messageService.add({
          severity: 'error',
          summary: 'No se pudo cobrar',
          detail: message,
          life: 6000,
        });
        // When the backend reports a missing or closed cash session, the
        // cached page state is stale: re-probe so the badge and the
        // canCheckout gate update immediately (and the cashier sees why
        // the next attempt is blocked).
        if (code === 'CASH_SESSION_NOT_FOUND' || code === 'CASH_BRANCH_REQUIRED') {
          this.refreshCashSession();
        }
      },
    });
  }

  /** "Nueva venta" handler -- clears the cart, resets selection, closes the result. */
  startNewSale(): void {
    this.cart.clear();
    this.cartComponent()?.resetSelection();
    this.lastResult.set(null);
  }

  /** Closes the result dialog and clears its content from the page state. */
  onResultDialogClosed(): void {
    this.lastResult.set(null);
  }

  /** Returns true while the page is fetching the current cash session. */
  protected isCashSessionLoading(): boolean {
    return this.cashSessionLoading();
  }

  /** Returns the resolved branch name, or '' when no session is open. */
  protected branchName(): string {
    return this.cashSession()?.branchName ?? '';
  }

  private loadCashSession(): void {
    const branchId = this.resolvedBranchIdForSession();
    // For ADMIN, do not probe until a branch is selected.
    if (this.isAdmin() && branchId == null) {
      this.cashSession.set(null);
      this.cashSessionLoading.set(false);
      return;
    }
    this.cashSessionLoading.set(true);
    this.cash
      .currentSession(branchId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (session) => {
          this.cashSession.set(session);
          this.cashSessionLoading.set(false);
        },
        error: () => {
          this.cashSession.set(null);
          this.cashSessionLoading.set(false);
        },
      });
  }

  private formatMoney(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(value);
  }
}

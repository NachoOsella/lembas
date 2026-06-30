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

import { ErrorMappingService } from '../../../core/services/error-mapping';
import { getApiError } from '../../../shared/models/api-error';
import { OrderDetail } from '../../../shared/models/order';
import { CashSessionDto } from '../../../shared/models/cash-session';

import { CashService } from '../../../core/services/cash';

import { AppBadge } from '../../../shared/components/app-badge/app-badge';
import { AppButton } from '../../../shared/components/app-button/app-button';
import { AppPageHeader } from '../../../shared/components/app-page-header/app-page-header';
import { AppToast } from '../../../shared/components/app-toast/app-toast';

import { PosCartComponent } from './components/pos-cart/pos-cart';
import { PosCheckoutResultDialogComponent } from './components/pos-checkout-result-dialog/pos-checkout-result-dialog';
import { PosProductSearchComponent } from './components/pos-product-search/pos-product-search';
import { PosCartStore } from './state/pos-cart.store';
import {
  CreatePosSaleRequest,
  PosSaleService,
} from './services/pos-sale.service';

/**
 * POS landing page (S3-US09, S3-US10, S3-US11).
 *
 * <p>Two-panel layout: product search on the left, cart + payment selector
 * + "Cobrar" action on the right. Probes the current cash session on load
 * to surface a clear warning when the cashier has no OPEN register;
 * a "Cobrar" action is also gated on the cart not being empty.</p>
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
    AppPageHeader,
    AppToast,
    PosCartComponent,
    PosCheckoutResultDialogComponent,
    PosProductSearchComponent,
  ],
  templateUrl: './pos.html',
  styleUrl: './pos.css',
})
export class AdminPosPage implements OnInit {
  private readonly cart = inject(PosCartStore);
  private readonly posSale = inject(PosSaleService);
  private readonly cash = inject(CashService);
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
    this.loadCashSession();
  }

  /** F8 triggers a checkout when the page is in a chargeable state. */
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'F8') {
      return;
    }
    if (!this.canCheckout() || this.processing()) {
      return;
    }
    event.preventDefault();
    this.onCheckout();
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

    this.processing.set(true);
    const request: CreatePosSaleRequest = {
      items: lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
      })),
      paymentMethod,
      cashReceived,
      notes: null,
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
      },
    });
  }

  /** "Nueva venta" handler — clears the cart, resets selection, closes the result. */
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
    this.cashSessionLoading.set(true);
    this.cash
      .currentSession()
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

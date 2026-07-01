import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { MenuItem } from 'primeng/api';

import { AuthService } from '../../../core/services/auth';
import { Cart } from '../../../core/services/cart';
import { StoreBranchSelectionService } from '../../../core/services/store-branch-selection';
import {
  AppStoreNav,
  StoreBrandConfig,
} from '../../../shared/components/app-store-nav/app-store-nav';
import {
  AppStoreFooter,
  StoreFooterLink,
} from '../../../shared/components/app-store-footer/app-store-footer';
@Component({
  selector: 'app-store-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, AppStoreNav, AppStoreFooter],
  templateUrl: './store-layout.html',
  styleUrl: './store-layout.css',
})
/** Public store shell: delegates nav and footer to generic components. */
export class StoreLayout implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly cart = inject(Cart);
  protected readonly branchSelection = inject(StoreBranchSelectionService);

  protected readonly cartItemsCount = computed(() => this.cart.totalItems());

  /** Options shown in the pickup branch selector. */
  protected readonly branchOptions = computed(() =>
    this.branchSelection.branches().map((branch) => ({
      label: branch.address ? `${branch.name} - ${branch.address}` : branch.name,
      value: branch.id,
    })),
  );

  /** Whether the navigation should show the compact branch dropdown. */
  protected readonly showBranchDropdown = computed(
    () => !this.branchSelection.loading() && !this.branchSelection.error() && this.branchSelection.branches().length > 1,
  );

  /** Label shown when the selector is collapsed or when there is only one branch. */
  protected readonly selectedBranchLabel = computed(() => {
    const selected = this.branchSelection.selectedBranch();
    if (!selected) return 'Elegí sucursal de retiro';
    return selected.address ? `${selected.name} - ${selected.address}` : selected.name;
  });

  /** Whether a user is currently logged in. */
  protected readonly isLoggedIn = computed(() => this.auth.isAuthenticated());

  /** Display name for the logged-in user (first name, or email fallback). */
  protected readonly userDisplayName = computed(() => {
    const user = this.auth.currentUser();
    if (!user) return '';
    if (user.firstName) return user.firstName;
    return user.email;
  });

  /** Brand config for app-store-nav. */
  protected readonly brand: StoreBrandConfig = {
    logoUrl: '/brand/lembas-icon.svg?v=4',
    title: 'Lembas',
    subtitle: 'Tienda saludable',
    homeRoute: '/store',
  };

  /** Dropdown menu items for the user avatar. */
  protected readonly userMenuItems: MenuItem[] = [
    {
      label: 'Mis pedidos',
      icon: 'pi pi-receipt',
      routerLink: '/customer/orders',
    },
    {
      separator: true,
    },
    {
      label: 'Cerrar sesion',
      icon: 'pi pi-sign-out',
      command: () => this.logout(),
    },
  ];

  /** Flat footer links for app-store-footer. Only real, working links. */
  protected readonly footerLinks: readonly StoreFooterLink[] = [
    { label: 'Catálogo', path: '/store/products' },
    { label: 'Instagram', path: 'https://www.instagram.com/dietetica.lembas', external: true },
    { label: 'Facebook', path: 'https://www.facebook.com/dietetica.lembas', external: true },
  ];

  /** Copyright string for app-store-footer. */
  protected readonly copyright = `\u00a9 ${new Date().getFullYear()} Lembas`;

  /** Handwritten brand-moment tagline for the footer. */
  protected readonly footerTagline = 'Tu dietética de confianza';

  /** City / pickup marker for the footer. */
  protected readonly footerCity = 'Córdoba, Argentina';

  /** Pickup label that introduces the city marker. */
  protected readonly footerPickupLabel = 'Retiro en sucursal';

    ngOnInit(): void {
    // Hydrate auth state from HttpOnly cookies so the nav shows login/register
    // or user info correctly before the first render completes.
    this.auth.ensureSession().subscribe();

    this.branchSelection.loadBranches().subscribe({
      error: () => {
        // State is handled in the service; the layout keeps rendering the store.
      },
    });
  }

  /** Updates the selected pickup branch from the public selector. */
  protected onBranchChange(branchId: number | null): void {
    this.branchSelection.selectBranch(branchId);
  }

  /** Navigate to store catalog with the submitted search query parameter. */
  onSearch(query: string): void {
    const trimmed = query.trim();
    if (trimmed) {
      this.router.navigate(['/store/products'], { queryParams: { q: trimmed } });
      this.scrollToCatalogResults();
      return;
    }

    // Empty submissions only clear an existing catalog search; they should not
    // unexpectedly move users from another store page into the catalog.
    if (this.router.url.startsWith('/store/products') && this.router.url.includes('q=')) {
      this.router.navigate(['/store/products'], { queryParams: {} });
    }
  }

  /**
   * Scrolls the catalog results section into view. The router's
   * `scrollPositionRestoration: 'top'` runs first, so the user briefly lands
   * at the top and then a smooth scroll brings the results card into view.
   * The setTimeout gives the catalog component a chance to mount (or re-render
   * the existing instance) before we measure the target.
   */
  private scrollToCatalogResults(): void {
    setTimeout(() => {
      const target = document.getElementById('catalog-results');
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  }

  /** Navigate to the public cart page. */
  goToCart(): void {
    this.router.navigate(['/store/cart']);
  }

  /** Logs out the current user and navigates to the store home page. */
  logout(): void {
    // auth.logout() clears the in-memory state synchronously before the HTTP
    // call, so the guest guard on /store does not bounce the user back.
    this.auth.logout().subscribe({
      complete: () => this.router.navigate(['/store']),
    });
  }
}

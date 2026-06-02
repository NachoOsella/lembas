import { Component, computed, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { MenuItem } from 'primeng/api';

import { AuthService } from '../../../core/services/auth';
import { Cart } from '../../../core/services/cart';
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
  imports: [RouterOutlet, AppStoreNav, AppStoreFooter],
  templateUrl: './store-layout.html',
  styleUrl: './store-layout.css',
})
/** Public store shell: delegates nav and footer to generic components. */
export class StoreLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cart = inject(Cart);

  protected readonly cartItemsCount = computed(() => this.cart.totalItems());

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

  /** Navigate to store catalog with the submitted search query parameter. */
  onSearch(query: string): void {
    const trimmed = query.trim();
    if (trimmed) {
      this.router.navigate(['/store/products'], { queryParams: { q: trimmed } });
      return;
    }

    // Empty submissions only clear an existing catalog search; they should not
    // unexpectedly move users from another store page into the catalog.
    if (this.router.url.startsWith('/store/products') && this.router.url.includes('q=')) {
      this.router.navigate(['/store/products'], { queryParams: {} });
    }
  }

  /** Navigate to the cart/checkout page. */
  goToCart(): void {
    this.router.navigate(['/customer/checkout']);
  }

  /** Logs out the current user and navigates to the store home page. */
  logout(): void {
    this.auth.logout();
    this.router.navigate(['/store']);
  }
}

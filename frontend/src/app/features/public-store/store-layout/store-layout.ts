import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

import { AuthService } from '../../../core/services/auth';

interface FooterLink {
  readonly label: string;
  readonly path: string;
  readonly external?: boolean;
}

interface StoreNavItem {
  readonly label: string;
  readonly path: string;
}

@Component({
  selector: 'app-store-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ButtonModule, MenuModule],
  templateUrl: './store-layout.html',
  styleUrl: './store-layout.css',
})
/** Public store shell with Lembas brand: sticky nav, minimal footer, Leaf CTA floating button. */
export class StoreLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly cartItemsCount = signal(0);
  protected readonly currentYear = new Date().getFullYear();

  /** Whether a user is currently logged in. */
  protected readonly isLoggedIn = computed(() => this.auth.isAuthenticated());

  /** Display name for the logged-in user (email or first name). */
  protected readonly userDisplayName = computed(() => {
    const user = this.auth.currentUser();
    if (!user) return '';
    if (user.firstName) return user.firstName;
    return user.email;
  });

  /** Dropdown menu items for the user avatar in the store topbar. */
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

  protected readonly navItems: readonly StoreNavItem[] = [
    { label: 'Tienda', path: '/store' },
    { label: 'Productos', path: '/store' },
    { label: 'Como comprar', path: '/store#como-comprar' },
  ];

  /** Flat footer links rendered inline in a single row. */
  protected readonly footerLinks: readonly FooterLink[] = [
    { label: 'Como comprar', path: '/store' },
    { label: 'Retiro en sucursal', path: '/store' },
    { label: 'Terminos', path: '/store' },
    { label: 'Privacidad', path: '/store' },
    { label: 'Instagram', path: 'https://www.instagram.com/', external: true },
    { label: 'Facebook', path: 'https://www.facebook.com/', external: true },
  ];

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

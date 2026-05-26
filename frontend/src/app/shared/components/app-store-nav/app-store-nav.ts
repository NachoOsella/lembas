import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

/** A single navigation link in the store nav. */
export interface StoreNavLink {
  readonly label: string;
  readonly path: string;
}

/** Brand display configuration. */
export interface StoreBrandConfig {
  readonly logoUrl: string;
  readonly title: string;
  readonly subtitle: string;
  readonly homeRoute: string;
}

@Component({
  selector: 'app-store-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MenuModule],
  templateUrl: './app-store-nav.html',
  styleUrl: './app-store-nav.css',
})
/**
 * Generic Lembas store top navigation bar.
 * Displays brand logo, nav links, auth state, user menu, and cart icon.
 */
export class AppStoreNav {
  /** Navigation links displayed in the center. */
  readonly navItems = input.required<readonly StoreNavLink[]>();

  /** Brand display configuration. */
  readonly brand = input.required<StoreBrandConfig>();

  /** Current cart items count (shown as badge on the cart icon). */
  readonly cartCount = input(0);

  /** Whether a user is currently logged in. */
  readonly isLoggedIn = input(false);

  /** Display name for the logged-in user. */
  readonly userDisplayName = input('');

  /** Dropdown menu items shown in the user avatar popup. */
  readonly userMenuItems = input<MenuItem[]>([]);

  /** Emitted when the user clicks "Cerrar sesión" or triggers logout. */
  readonly logout = output<void>();

  /** Emitted when the user clicks the cart icon. */
  readonly cartClick = output<void>();
}

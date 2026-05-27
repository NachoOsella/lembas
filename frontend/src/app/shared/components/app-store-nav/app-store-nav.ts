import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { AppSearchBar } from '../app-search-bar/app-search-bar';

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
  imports: [RouterLink, RouterLinkActive, MenuModule, AppSearchBar],
  templateUrl: './app-store-nav.html',
  styleUrl: './app-store-nav.css',
})
export class AppStoreNav {
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

  /** Whether to show the search bar (default true). */
  readonly showSearch = input(true);

  /** Placeholder text for the search bar. */
  readonly searchPlaceholder = input('Buscar productos...');

  /** Emitted when the user submits a search query. */
  readonly searchQuery = output<string>();

  /** Emitted when the user clicks "Cerrar sesión" or triggers logout. */
  readonly logout = output<void>();

  /** Emitted when the user clicks the cart icon. */
  readonly cartClick = output<void>();
}

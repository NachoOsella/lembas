import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import type { MenuItem } from 'primeng/api';
import { AppButton } from '@shared/components/app-button/app-button';
import { AppSearchBar } from '@shared/components/app-search-bar/app-search-bar';
import { AppSelect } from '@shared/components/app-select/app-select';

/** Brand display configuration. */
export interface StoreBrandConfig {
  readonly logoUrl: string;
  readonly title: string;
  readonly subtitle: string;
  readonly homeRoute: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-store-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MenuModule, AppButton, AppSearchBar, AppSelect],
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

  /** Branch options shown in the compact pickup selector. */
  readonly branchOptions = input<readonly { label: string; value: number }[]>([]);

  /** Current selected pickup branch id. */
  readonly selectedBranchId = input<number | null>(null);

  /** Human-readable selected pickup branch label. */
  readonly selectedBranchLabel = input('Elegí sucursal');

  /** Whether branch options are currently loading. */
  readonly branchesLoading = input(false);

  /** Whether branch options failed to load. */
  readonly branchesError = input(false);

  /** Whether more than one branch is available and a dropdown should be shown. */
  readonly showBranchDropdown = input(false);

  /** Placeholder text for the search bar. */
  readonly searchPlaceholder = input('Buscar productos...');

  /** Emitted when the user submits a search query. */
  readonly searchQuery = output<string>();

  /** Emitted when the user changes the pickup branch. */
  readonly branchChange = output<number | null>();

  /** Emitted when the user clicks "Cerrar sesión" or triggers logout. */
  readonly logout = output<void>();

  /** Emitted when the user clicks the cart icon. */
  readonly cartClick = output<void>();

  /**
   * Whether to render the floating cart CTA. Defaults to true. The parent
   * (typically the public store layout) sets this to false on routes where
   * the user is already inside the cart or checkout flow, so the floating
   * button does not overlap the page content.
   */
  readonly showFloatingCart = input(true);
}

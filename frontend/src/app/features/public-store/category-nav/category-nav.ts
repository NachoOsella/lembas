import { Component, computed, input, output } from '@angular/core';

import { StoreCategory } from '../../../shared/models/category';

/**
 * Horizontal scrollable category navigation for the public store catalog.
 *
 * Renders a single-row scrollable strip of pill buttons. On mobile it scrolls
 * horizontally; on desktop it wraps or scrolls depending on the number of items.
 * Includes loading skeleton and error states.
 */
@Component({
  selector: 'app-category-nav',
  templateUrl: './category-nav.html',
  styleUrl: './category-nav.css',
})
export class CategoryNav {
  readonly categories = input.required<StoreCategory[]>();
  readonly loading = input(false);
  readonly error = input(false);
  readonly selectedCategoryId = input<number | null>(null);
  readonly allSelected = output<void>();
  readonly categorySelected = output<number>();
}

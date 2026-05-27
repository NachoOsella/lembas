import { Component, input, output } from '@angular/core';

import { StoreCategory } from '../../../shared/models/category';

/** Reusable public-store category navigation with loading, error and empty states. */
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

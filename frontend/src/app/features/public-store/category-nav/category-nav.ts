import { Component, computed, input, output, signal } from '@angular/core';

import { StoreCategory } from '../../../shared/models/category';

/**
 * Number of categories visible before the "ver mas" toggle.
 * When the list exceeds this count, a collapsible toggle is shown.
 */
const COLLAPSE_THRESHOLD = 6;

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

  /** Whether the full list is expanded (past the collapse threshold). */
  protected readonly expanded = signal(false);

  /** True when the category count exceeds the collapse threshold. */
  protected readonly shouldCollapse = computed(
    () => this.categories().length > COLLAPSE_THRESHOLD,
  );

  /** Categories visible in the DOM, respecting the collapse/expand state. */
  protected readonly visibleCategories = computed(() => {
    const cats = this.categories();
    if (!this.shouldCollapse() || this.expanded()) return cats;
    return cats.slice(0, COLLAPSE_THRESHOLD);
  });

  /** Number of hidden categories when collapsed. */
  protected readonly hiddenCount = computed(() => {
    if (!this.shouldCollapse() || this.expanded()) return 0;
    return this.categories().length - COLLAPSE_THRESHOLD;
  });

  /** Toggle expanded/collapsed state. */
  protected toggleExpanded(): void {
    this.expanded.update((v) => !v);
  }
}

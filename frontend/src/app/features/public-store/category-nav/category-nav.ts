import { Component, computed, input, output, signal } from '@angular/core';

import { StoreCategory } from '../../../shared/models/category';

/**
 * Responsive category selector for the public catalog.
 *
 * Desktop: clean row of compact pills with a "Ver todas" action that opens a centered overlay.
 * Mobile: pills hidden; a single button opens a bottom sheet with all categories + search.
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

  protected readonly panelOpen = signal(false);
  protected readonly searchTerm = signal('');

  protected readonly selectedCategory = computed(() =>
    this.categories().find((c) => c.id === this.selectedCategoryId()) ?? null,
  );

  protected readonly totalProductCount = computed(() =>
    this.categories().reduce((t, c) => t + c.productCount, 0),
  );

  /** Top categories by product count, shown as quick pills. */
  protected readonly quickCategories = computed(() =>
    [...this.categories()]
      .sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name))
      .slice(0, 6),
  );

  /** Pill list: quick categories + selected if it is not already in the top. */
  protected readonly displayCategories = computed(() => {
    const quick = this.quickCategories();
    const selected = this.selectedCategory();
    if (!selected || quick.some((c) => c.id === selected.id)) {
      return quick;
    }
    return [...quick, selected];
  });

  protected readonly filteredCategories = computed(() => {
    const q = this.normalize(this.searchTerm());
    const cats = [...this.categories()].sort((a, b) => a.name.localeCompare(b.name));
    return q ? cats.filter((c) => this.normalize(c.name).includes(q)) : cats;
  });

  protected readonly selectedLabel = computed(() => this.selectedCategory()?.name ?? 'Todas');

  protected togglePanel(): void {
    this.panelOpen.update((v) => !v);
    this.searchTerm.set('');
  }

  protected closePanel(): void {
    this.panelOpen.set(false);
    this.searchTerm.set('');
  }

  protected selectAll(): void {
    this.allSelected.emit();
    this.closePanel();
  }

  protected selectCategory(id: number): void {
    this.categorySelected.emit(id);
    this.closePanel();
  }

  private normalize(v: string): string {
    return v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }
}

import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  contentChild,
  input,
  output,
  TemplateRef,
} from '@angular/core';
import { Carousel, CarouselResponsiveOptions } from 'primeng/carousel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Emitted when the carousel page changes. */
export interface CarouselPageChangeEvent {
  readonly page: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Generic carousel wrapper around PrimeNG's `p-carousel`.
 *
 * Exposes the core PrimeNG carousel inputs with typed APIs, plus
 * Lembas-branded default styling (navigation arrows, indicators, shadows).
 * Supports custom item templates via content projection.
 *
 * @example
 * ```html
 * <app-carousel
 *   [value]="products"
 *   [numVisible]="4"
 *   [numScroll]="1"
 *   [circular]="true"
 *   [autoplayInterval]="5000"
 *   [responsiveOptions]="responsiveOptions"
 *   (pageChange)="onPageChange($event)"
 * >
 *   <ng-template #item let-product>
 *     <app-product-card [product]="product" />
 *   </ng-template>
 * </app-carousel>
 * ```
 */
@Component({
  selector: 'app-carousel',
  imports: [NgTemplateOutlet, Carousel],
  templateUrl: './app-carousel.html',
  styleUrl: './app-carousel.css',
})
export class AppCarousel<T = unknown> {
  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  /** Array of items to display. */
  readonly value = input.required<T[]>();

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------

  /** Number of items visible per page. */
  readonly numVisible = input(1);

  /** Number of items to scroll on each navigation action. */
  readonly numScroll = input(1);

  /** Orientation of the carousel. */
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');

  /** Viewport height when orientation is vertical. */
  readonly verticalViewPortHeight = input('300px');

  // ---------------------------------------------------------------------------
  // Behaviour
  // ---------------------------------------------------------------------------

  /** Whether scrolling should wrap around infinitely. */
  readonly circular = input(false);

  /** Autoplay interval in milliseconds (0 = disabled). */
  readonly autoplayInterval = input(0);

  /** Whether to show indicator dots. */
  readonly showIndicators = input(true);

  /** Whether to show previous/next navigation buttons. */
  readonly showNavigators = input(true);

  /** Responsive breakpoint overrides for numVisible and numScroll. */
  readonly responsiveOptions = input<CarouselResponsiveOptions[]>([]);

  // ---------------------------------------------------------------------------
  // Header
  // ---------------------------------------------------------------------------

  /** Optional header text displayed above the carousel. */
  readonly headerText = input('');

  // ---------------------------------------------------------------------------
  // Templates
  // ---------------------------------------------------------------------------

  /**
   * Content-projected item template.
   * Context: `{ $implicit: item }` where `item` is an element of `value`.
   *
   * @example
   * ```html
   * <ng-template #item let-product>
   *   <p>{{ product.name }}</p>
   * </ng-template>
   * ```
   */
  protected readonly itemTemplate = contentChild<TemplateRef<unknown>>('item');

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  /** Emitted when the active page changes. */
  readonly pageChange = output<CarouselPageChangeEvent>();

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  /** Whether the component has a header to render. */
  protected readonly hasHeader = computed(
    () => this.headerText().length > 0,
  );

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /** Forwards the PrimeNG page event as a typed output. */
  protected onPageChange(event: { page?: number }): void {
    this.pageChange.emit({ page: event.page ?? 0 });
  }
}

import { Component, ViewEncapsulation, computed, inject, input, model, output, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Dialog } from 'primeng/dialog';

/**
 * Shared PrimeNG dialog wrapper used by feature forms and admin modals.
 *
 * On mobile viewports the dialog switches to `position="top"` to prevent
 * the centering-induced jump that happens when the virtual keyboard opens
 * (especially on Android, where the layout viewport resizes and causes
 * `top: 50%` to recalculate).
 */
@Component({
  selector: 'app-modal',
  host: { class: 'app-modal-host' },
  imports: [Dialog],
  templateUrl: './app-modal.html',
  styleUrl: './app-modal.css',
  encapsulation: ViewEncapsulation.None,
})
export class AppModal {
  private readonly document = inject(DOCUMENT);

  readonly visible = model(false);
  readonly title = input<string>('');
  readonly width = input<string>('min(92vw, 28rem)');
  readonly dismissible = input(true);
  readonly closable = input(true);
  readonly draggable = input(false);
  readonly resizable = input(false);
  readonly modal = input(true);
  /** Viewport width below which the dialog switches to top positioning. */
  readonly mobileBreakpoint = input(768);

  readonly hidden = output<void>();

  /** Tracks whether the current viewport is considered mobile. */
  private readonly isMobile = signal(false);

  /** Resolved dialog position: 'top' on mobile, 'center' otherwise. */
  protected readonly dialogPosition = computed(() => (this.isMobile() ? 'top' : 'center'));

  /** Breakpoints object passed to PrimeNG for responsive width.
   * Note: the inline `[style]` width has higher specificity than the
   * breakpoints-generated CSS, so the actual mobile-width enforcement
   * lives in app-modal.css (`!important` override). We keep this for
   * PrimeNG's internal layout calculations only. */
  protected readonly breakpoints = computed(() => ({
    [`${this.mobileBreakpoint()}px`]: 'calc(100vw - 1rem)',
  }));

  constructor() {
    // React to viewport resizes using matchMedia.
    const mql = this.document.defaultView?.matchMedia(`(max-width: ${this.mobileBreakpoint()}px)`) ?? null;
    if (mql) {
      this.isMobile.set(mql.matches);
      mql.addEventListener('change', (e) => this.isMobile.set(e.matches));
    }
  }

  protected onHide(): void {
    this.visible.set(false);
    this.hidden.emit();
  }
}

import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** A single footer link. If `external` is true, renders as <a href> with target _blank. */
export interface StoreFooterLink {
  readonly label: string;
  readonly path: string;
  readonly external?: boolean;
}

@Component({
  selector: 'app-store-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './app-store-footer.html',
  styleUrl: './app-store-footer.css',
})
/**
 * Generic Lembas store footer.
 * Minimal single-row layout: copyright on the left, inline links on the right.
 */
export class AppStoreFooter {
  /** Flat list of footer links rendered inline. */
  readonly links = input.required<readonly StoreFooterLink[]>();

  /** Copyright text (e.g., "2025 Lembas"). */
  readonly copyright = input.required<string>();
}

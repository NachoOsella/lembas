import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

/** A single footer link. If `external` is true, renders as <a href> with target _blank. */
export interface StoreFooterLink {
  readonly label: string;
  readonly path: string;
  readonly external?: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-store-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './app-store-footer.html',
  styleUrl: './app-store-footer.css',
})
export class AppStoreFooter {
  /** Flat list of footer links. External links render as social icon buttons. */
  readonly links = input.required<readonly StoreFooterLink[]>();

  /** Copyright text (e.g., "2026 Lembas"). */
  readonly copyright = input.required<string>();

  /** Handwritten brand-moment tagline (Caveat script). */
  readonly tagline = input<string>('Tu dietética de confianza');

  /** City / location marker shown under the brand block. */
  readonly city = input<string>('Córdoba, Argentina');

  /** Pickup label shown before the city (defaults to "Retiro en sucursal"). */
  readonly pickupLabel = input<string>('Retiro en sucursal');

  /** URL of the brand mark image (reuses the nav logo). */
  readonly logoUrl = input<string>('/brand/lembas-icon.svg?v=4');

  /** Internal (router) links rendered in the "Tienda" column. */
  protected readonly internalLinks = computed(() => this.links().filter((l) => !l.external));

  /** External links rendered as social icon buttons on the right. */
  protected readonly externalLinks = computed(() => this.links().filter((l) => l.external));

  /** PrimeIcons class for a given social URL. Falls back to a generic external icon. */
  protected iconForPath(path: string): string {
    const url = path.toLowerCase();
    if (url.includes('instagram.com')) return 'pi-instagram';
    if (url.includes('facebook.com')) return 'pi-facebook';
    if (url.includes('whatsapp.com') || url.includes('wa.me')) return 'pi-whatsapp';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'pi-twitter';
    if (url.includes('tiktok.com')) return 'pi-tiktok';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'pi-youtube';
    return 'pi-link';
  }
}

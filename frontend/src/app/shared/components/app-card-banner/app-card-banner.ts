import { Component, input } from '@angular/core';

/** Position of the decorative blob. */
export type BlobPosition =
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left'
  | 'center-right'
  | 'center-left';

/** Position mapping to Tailwind classes. */
const BLOB_POSITION_MAP: Record<BlobPosition, string> = {
  'top-right': '-right-10 -top-10',
  'top-left': '-left-10 -top-10',
  'bottom-right': '-right-10 -bottom-10',
  'bottom-left': '-left-10 -bottom-10',
  'center-right': '-right-10 top-1/2 -translate-y-1/2',
  'center-left': '-left-10 top-1/2 -translate-y-1/2',
};

@Component({
  selector: 'app-card-banner',
  templateUrl: './app-card-banner.html',
  styleUrl: './app-card-banner.css',
})
export class CardBanner {
  /** Background color of the card. @default '#ffffff' */
  readonly bgColor = input('#ffffff');

  /** Border color of the card. @default 'rgba(7, 95, 54, 0.08)' */
  readonly borderColor = input('rgba(7, 95, 54, 0.08)');

  /** Text color of the card. @default 'rgba(0, 0, 0, 0.87)' */
  readonly textColor = input('rgba(0, 0, 0, 0.87)');

  /** Blob color (hex). @default '#2f8d72' */
  readonly blobColor = input('#2f8d72');

  /** Blob opacity percentage (0-100). @default 5 */
  readonly blobOpacity = input(5);

  /** Blob position. @default 'top-right' */
  readonly blobPosition = input<BlobPosition>('top-right');

  /** Blob size variant. @default 'md' */
  readonly blobSize = input<'sm' | 'md' | 'lg'>('md');

  /** Whether the card should be clickable (adds hover effect). @default false */
  readonly clickable = input(false);

  /** Border radius of the card. @default '12px' */
  readonly borderRadius = input('12px');

  /** Padding of the card. @default '2rem' */
  readonly padding = input('2rem');

  /** Whether to show the blob. @default true */
  readonly showBlob = input(true);

  /** Returns the Tailwind classes for the blob position. */
  get blobPositionClass(): string {
    return BLOB_POSITION_MAP[this.blobPosition()];
  }

  /** Returns the blob size in pixels. */
  get blobSizePx(): string {
    const sizes = { sm: '120px', md: '160px', lg: '200px' };
    return sizes[this.blobSize()];
  }

  /** Returns the blob background color with opacity. */
  get blobBg(): string {
    return `color-mix(in srgb, ${this.blobColor()} ${this.blobOpacity()}%, transparent)`;
  }
}

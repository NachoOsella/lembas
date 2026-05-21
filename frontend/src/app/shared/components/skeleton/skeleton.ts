import { Component, input } from '@angular/core';
import { Skeleton as PrimeSkeleton } from 'primeng/skeleton';

@Component({
  selector: 'app-skeleton',
  imports: [PrimeSkeleton],
  templateUrl: './skeleton.html',
  styleUrl: './skeleton.css',
})
/** Renders a PrimeNG shimmering visual placeholder for loading states. */
export class Skeleton {
  readonly width = input('100%');
  readonly height = input('1rem');
  readonly shape = input<'text' | 'rect' | 'circle'>('text');
}

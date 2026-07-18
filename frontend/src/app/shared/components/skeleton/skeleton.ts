import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { Skeleton as PrimeSkeleton } from 'primeng/skeleton';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-skeleton',
  imports: [PrimeSkeleton],
  templateUrl: './skeleton.html',
  styleUrl: './skeleton.css',
})
export class Skeleton {
  readonly width = input('100%');
  readonly height = input('1rem');
  readonly shape = input<'text' | 'rect' | 'circle'>('text');
}

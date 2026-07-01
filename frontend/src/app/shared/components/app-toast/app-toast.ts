import { Component, OnDestroy, inject, input, signal } from '@angular/core';
import { Toast } from 'primeng/toast';

@Component({
  selector: 'app-toast',
  imports: [Toast],
  templateUrl: './app-toast.html',
  styleUrl: './app-toast.css',
})
export class AppToast implements OnDestroy {
  readonly life = input(4000);

  /** Active PrimeNG position: top-right on desktop, top-center on mobile. */
  protected readonly position = signal<'top-right' | 'top-center'>('top-right');

  private readonly mq = window.matchMedia('(max-width: 40rem)');

  private readonly onChange = (e: MediaQueryListEvent): void => {
    this.position.set(e.matches ? 'top-center' : 'top-right');
  };

  constructor() {
    this.position.set(this.mq.matches ? 'top-center' : 'top-right');
    this.mq.addEventListener('change', this.onChange);
  }

  ngOnDestroy(): void {
    this.mq.removeEventListener('change', this.onChange);
  }
}

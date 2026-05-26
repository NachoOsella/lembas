import { Component, input } from '@angular/core';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';

/**
 * Lembas-styled toast notification wrapper over PrimeNG Toast.
 * Inject MessageService in your feature to show toasts programmatically.
 */
@Component({
  selector: 'app-toast',
  imports: [Toast],
  templateUrl: './app-toast.html',
  styleUrl: './app-toast.css',
})
export class AppToast {
  readonly position = input<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'>('top-right');
  readonly life = input(4000);
}

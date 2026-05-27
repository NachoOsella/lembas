import { Component, input } from '@angular/core';
import { Toast } from 'primeng/toast';

@Component({
  selector: 'app-toast',
  imports: [Toast],
  templateUrl: './app-toast.html',
  styleUrl: './app-toast.css',
})
export class AppToast {
  readonly position = input<
    'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
  >('top-right');
  readonly life = input(4000);
}

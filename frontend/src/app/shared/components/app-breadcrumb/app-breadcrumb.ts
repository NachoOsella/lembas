import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { Breadcrumb } from 'primeng/breadcrumb';
import type { MenuItem } from 'primeng/api';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-breadcrumb',
  imports: [Breadcrumb],
  templateUrl: './app-breadcrumb.html',
  styleUrl: './app-breadcrumb.css',
})
export class AppBreadcrumb {
  readonly items = input.required<MenuItem[]>();
  readonly home = input<MenuItem | undefined>(undefined);
}

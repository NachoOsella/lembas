import { Component, input } from '@angular/core';
import { Breadcrumb } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-breadcrumb',
  imports: [Breadcrumb],
  templateUrl: './app-breadcrumb.html',
  styleUrl: './app-breadcrumb.css',
})
export class AppBreadcrumb {
  readonly items = input.required<MenuItem[]>();
  readonly home = input<MenuItem | undefined>(undefined);
}

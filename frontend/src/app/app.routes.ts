import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth-guard';
import { adminGuard } from './core/guards/admin-guard';
import { customerGuard } from './core/guards/customer-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/store',
    pathMatch: 'full',
  },
  {
    path: 'store',
    loadChildren: () => import('./features/public-store/public-store.routes'),
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes'),
  },
  {
    path: 'customer',
    loadChildren: () => import('./features/customer/customer.routes'),
    canActivate: [authGuard, customerGuard],
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes'),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'dev/ui',
    loadComponent: () =>
      import('./features/dev/component-showcase/component-showcase').then(
        (m) => m.ComponentShowcase,
      ),
  },
  {
    path: '**',
    redirectTo: '/store',
  },
];

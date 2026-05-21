import { Routes } from '@angular/router';

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
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes'),
  },
  {
    path: 'dev/ui',
    loadComponent: () => import('./features/dev/component-showcase/component-showcase').then((m) => m.ComponentShowcase),
  },
  {
    path: '**',
    redirectTo: '/store',
  },
];

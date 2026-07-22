import type { Routes } from '@angular/router';

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
    path: 'catalog',
    redirectTo: '/store/products',
    pathMatch: 'full',
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
    path: 'error/500',
    redirectTo: '/store/error/500',
  },
  {
    path: '**',
    redirectTo: '/store/error/404',
  },
];

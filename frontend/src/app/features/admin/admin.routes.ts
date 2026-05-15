import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth-guard';
import { adminGuard } from '../../core/guards/admin-guard';

export default [
  {
    path: '',
    canActivate: [authGuard, adminGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'products',
        loadComponent: () => import('./products/products').then((m) => m.Products),
      },
      {
        path: 'inventory',
        loadComponent: () => import('./inventory/inventory').then((m) => m.Inventory),
      },
      {
        path: 'orders',
        loadComponent: () => import('./orders/orders').then((m) => m.Orders),
      },
      {
        path: 'pos',
        loadComponent: () => import('./pos/pos').then((m) => m.Pos),
      },
      {
        path: 'cash',
        loadComponent: () => import('./cash/cash').then((m) => m.Cash),
      },
      {
        path: 'suppliers',
        loadComponent: () => import('./suppliers/suppliers').then((m) => m.Suppliers),
      },
      {
        path: 'reports',
        loadComponent: () => import('./reports/reports').then((m) => m.Reports),
      },
      {
        path: 'users',
        loadComponent: () => import('./users/users').then((m) => m.Users),
      },
    ],
  },
] as Routes;

import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth-guard';
import { adminGuard, adminOnlyGuard } from '../../core/guards/admin-guard';

export default [
  {
    path: '',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./admin-layout/admin-layout').then((m) => m.AdminLayout),
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
        path: 'categories',
        loadComponent: () => import('./categories/categories').then((m) => m.Categories),
      },
      {
        path: 'products',
        loadComponent: () => import('./products/products').then((m) => m.Products),
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./products/product-list/product-list').then((m) => m.ProductList),
          },
          {
            path: 'new',
            loadComponent: () =>
              import('./products/product-form/product-form').then((m) => m.ProductForm),
          },
          {
            path: ':id/edit',
            loadComponent: () =>
              import('./products/product-form/product-form').then((m) => m.ProductForm),
          },
        ],
      },
      {
        path: 'inventory',
        loadComponent: () => import('./inventory/inventory').then((m) => m.Inventory),
      },
      {
        path: 'stock/entry',
        loadComponent: () => import('./stock-entry/stock-entry').then((m) => m.StockEntry),
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
        canActivate: [adminOnlyGuard],
        loadComponent: () => import('./users/users').then((m) => m.Users),
      },
    ],
  },
] as Routes;

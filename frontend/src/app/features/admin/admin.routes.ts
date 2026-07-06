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
        path: 'inventory/product/:productId/lots',
        loadComponent: () =>
          import('./stock-lot-detail/stock-lot-detail').then((m) => m.StockLotDetail),
      },
      {
        path: 'stock/entry',
        redirectTo: 'receipts',
        pathMatch: 'full',
      },
      {
        path: 'stock/receipts',
        redirectTo: 'receipts',
        pathMatch: 'full',
      },
      {
        path: 'recepciones',
        redirectTo: 'receipts',
        pathMatch: 'full',
      },
      {
        path: 'receips',
        redirectTo: 'receipts',
        pathMatch: 'full',
      },
      {
        path: 'receipts',
        loadComponent: () => import('./stock-entry/stock-entry').then((m) => m.StockEntry),
      },
      {
        path: 'orders',
        children: [
          {
            path: '',
            loadComponent: () => import('./orders/orders').then((m) => m.Orders),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./orders/order-detail-page/order-detail-page').then(
                (m) => m.OrderDetailPage,
              ),
          },
        ],
      },
      {
        path: 'pos',
        loadComponent: () => import('./pos/pos').then((m) => m.AdminPosPage),
      },
      {
        path: 'cash',
        loadComponent: () => import('./cash/cash').then((m) => m.Cash),
      },
      {
        path: 'cash/open',
        loadComponent: () => import('./cash/open/cash-open').then((m) => m.CashOpen),
      },
      {
        // Declared BEFORE the generic cash/:id route so Angular's first-match
        // router picks this path when navigating to /admin/cash/close/:id.
        path: 'cash/close/:sessionId',
        loadComponent: () => import('./cash/close/cash-close').then((m) => m.CashClose),
      },
      {
        path: 'cash/:id',
        loadComponent: () => import('./cash/detail/cash-detail').then((m) => m.CashDetail),
      },
      {
        path: 'stock/movements',
        loadComponent: () =>
          import('./stock-movements/stock-movements').then((m) => m.StockMovements),
      },
      {
        path: 'suppliers',
        loadComponent: () => import('./suppliers/suppliers').then((m) => m.Suppliers),
      },
      {
        path: 'suppliers/:id/products',
        loadComponent: () => import('./suppliers/suppliers').then((m) => m.Suppliers),
      },
      {
        path: 'purchase-orders',
        loadComponent: () =>
          import('./purchase-orders/purchase-orders').then((m) => m.PurchaseOrders),
      },
      {
        path: 'pricing',
        loadComponent: () =>
          import('./pricing/price-update-workflow').then((m) => m.PriceUpdateWorkflow),
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

import type { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth-guard';
import { adminGuard, adminOnlyGuard, roleGuard } from '@core/guards/admin-guard';

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
        canActivate: [roleGuard('ADMIN', 'MANAGER')],
        loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'categories',
        canActivate: [roleGuard('ADMIN', 'MANAGER')],
        loadComponent: () => import('./categories/categories').then((m) => m.Categories),
      },
      {
        path: 'products',
        canActivate: [roleGuard('ADMIN', 'MANAGER')],
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
        canActivate: [roleGuard('ADMIN', 'MANAGER', 'EMPLOYEE')],
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
              import('./orders/order-detail-page/order-detail-page').then((m) => m.OrderDetailPage),
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
        // Cash history list + detail (S4-US05). Declared BEFORE the generic
        // /admin/cash/:id route so Angular's first-match router picks these
        // when navigating to /admin/cash/history or /admin/cash/history/:id.
        path: 'cash/history',
        canActivate: [roleGuard('ADMIN', 'MANAGER')],
        loadComponent: () =>
          import('./reports/cash-history/cash-session-history').then(
            (m) => m.CashSessionHistoryPageComponent,
          ),
      },
      {
        path: 'cash/history/:sessionId',
        canActivate: [roleGuard('ADMIN', 'MANAGER')],
        loadComponent: () =>
          import('./reports/cash-detail/cash-session-detail').then(
            (m) => m.CashSessionDetailReportPageComponent,
          ),
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
        canActivate: [roleGuard('ADMIN', 'MANAGER')],
        loadComponent: () => import('./suppliers/suppliers').then((m) => m.Suppliers),
      },
      {
        path: 'suppliers/:id/products',
        canActivate: [roleGuard('ADMIN', 'MANAGER')],
        loadComponent: () => import('./suppliers/suppliers').then((m) => m.Suppliers),
      },
      {
        path: 'purchase-orders',
        canActivate: [roleGuard('ADMIN', 'MANAGER')],
        loadComponent: () =>
          import('./purchase-orders/purchase-orders').then((m) => m.PurchaseOrders),
      },
      {
        path: 'pricing',
        canActivate: [roleGuard('ADMIN', 'MANAGER')],
        loadComponent: () =>
          import('./pricing/price-update-workflow').then((m) => m.PriceUpdateWorkflow),
      },
      {
        path: 'reports',
        canActivate: [roleGuard('ADMIN', 'MANAGER')],
        loadComponent: () => import('./reports/reports').then((m) => m.Reports),
      },
      {
        // Specific report pages (Sprint 4 reports). They are intentionally
        // NOT in the sidebar nav: they are only reachable through the reports
        // hub at /admin/reports so the navigation stays focused on the main
        // admin views.
        path: 'reports/cash',
        canActivate: [roleGuard('ADMIN', 'MANAGER')],
        loadComponent: () =>
          import('./reports/cash-overview/cash-overview').then((m) => m.CashOverviewPageComponent),
      },
      {
        path: 'reports/sales',
        canActivate: [roleGuard('ADMIN', 'MANAGER')],
        loadComponent: () =>
          import('./reports/sales-report/sales-report').then((m) => m.SalesReportPageComponent),
      },
      {
        path: 'reports/employees',
        canActivate: [roleGuard('ADMIN', 'MANAGER')],
        loadComponent: () =>
          import('./reports/employees-report/employees-report').then(
            (m) => m.EmployeesReportPageComponent,
          ),
      },
      {
        path: 'reports/inventory',
        canActivate: [roleGuard('ADMIN', 'MANAGER')],
        loadComponent: () =>
          import('./reports/inventory-report/inventory-report').then(
            (m) => m.InventoryReportPageComponent,
          ),
      },
      {
        path: 'reports/suppliers',
        canActivate: [roleGuard('ADMIN', 'MANAGER')],
        loadComponent: () =>
          import('./reports/suppliers-report/suppliers-report').then(
            (m) => m.SuppliersReportPageComponent,
          ),
      },
      {
        // Recommendations page (S4-US06).
        path: 'recommendations',
        canActivate: [roleGuard('ADMIN', 'MANAGER')],
        loadComponent: () =>
          import('./reports/recommendations/recommendations-panel').then(
            (m) => m.RecommendationsPanelComponent,
          ),
      },
      {
        path: 'users',
        canActivate: [adminOnlyGuard],
        loadComponent: () => import('./users/users').then((m) => m.Users),
      },
    ],
  },
] as Routes;

import type { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth-guard';
import { customerGuard } from '@core/guards/customer-guard';
import { CustomerLayout } from './customer-layout/customer-layout';

export default [
  {
    path: '',
    canActivate: [authGuard, customerGuard],
    component: CustomerLayout,
    children: [
      {
        path: 'profile',
        loadComponent: () => import('./profile/profile').then((m) => m.Profile),
      },
      {
        path: 'orders',
        loadComponent: () => import('./orders/orders').then((m) => m.Orders),
      },
      {
        path: 'orders/:id',
        loadComponent: () => import('./order-detail/order-detail').then((m) => m.OrderDetail),
      },
      {
        path: 'checkout',
        loadComponent: () => import('./checkout/checkout').then((m) => m.Checkout),
      },
      {
        path: 'payment/callback',
        loadComponent: () =>
          import('./payment-callback/payment-callback').then((m) => m.PaymentCallback),
      },
      {
        path: '**',
        redirectTo: 'orders',
      },
    ],
  },
] as Routes;

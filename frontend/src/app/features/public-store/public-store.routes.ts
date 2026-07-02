import { Routes } from '@angular/router';
import { ErrorPage } from '../../shared/components/error-page/error-page';

export default [
  {
    path: '',
    loadComponent: () => import('./store-layout/store-layout').then((m) => m.StoreLayout),
    children: [
      {
        path: '',
        loadComponent: () => import('./home/home').then((m) => m.Home),
      },
      {
        path: 'products',
        loadComponent: () => import('./catalog/catalog').then((m) => m.Catalog),
      },
      {
        path: 'products/:id',
        loadComponent: () => import('./product-detail/product-detail').then((m) => m.ProductDetail),
      },
      {
        path: 'cart',
        loadComponent: () => import('./cart/cart').then((m) => m.default),
      },
      {
        path: 'terms',
        loadComponent: () => import('./legal/terms/terms-page').then((m) => m.TermsPage),
      },
      {
        path: 'faq',
        loadComponent: () => import('./legal/faq/faq-page').then((m) => m.FaqPage),
      },
      {
        path: 'catalog',
        redirectTo: 'products',
        pathMatch: 'full',
      },
      {
        path: 'product/:id',
        redirectTo: 'products/:id',
      },
      {
        path: 'error/404',
        component: ErrorPage,
        data: { errorCode: '404' },
      },
      {
        path: 'error/403',
        component: ErrorPage,
        data: { errorCode: '403' },
      },
      {
        path: 'error/500',
        component: ErrorPage,
        data: { errorCode: '500' },
      },
    ],
  },
] as Routes;

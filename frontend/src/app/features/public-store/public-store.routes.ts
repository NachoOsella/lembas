import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./store-layout/store-layout').then((m) => m.StoreLayout),
    children: [
      {
        path: '',
        loadComponent: () => import('./catalog/catalog').then((m) => m.Catalog),
      },
      {
        path: 'product/:id',
        loadComponent: () => import('./product-detail/product-detail').then((m) => m.ProductDetail),
      },
    ],
  },
] as Routes;

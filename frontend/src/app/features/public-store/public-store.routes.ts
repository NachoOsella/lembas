import { Routes } from '@angular/router';

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
        path: 'catalog',
        redirectTo: 'products',
        pathMatch: 'full',
      },
      {
        path: 'product/:id',
        redirectTo: 'products/:id',
      },
    ],
  },
] as Routes;

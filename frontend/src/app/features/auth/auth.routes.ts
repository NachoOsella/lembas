import type { Routes } from '@angular/router';

import { guestGuard } from '@core/guards/auth-guard';

export default [
  {
    path: 'login',
    loadComponent: () => import('./login/login').then((m) => m.Login),
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./register/register').then((m) => m.Register),
    canActivate: [guestGuard],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
] as Routes;

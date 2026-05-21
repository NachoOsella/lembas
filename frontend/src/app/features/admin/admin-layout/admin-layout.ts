import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';
import { MenuItem } from 'primeng/api';
import { Avatar } from 'primeng/avatar';
import { Breadcrumb } from 'primeng/breadcrumb';
import { Button } from 'primeng/button';

interface AdminNavItem {
  readonly label: string;
  readonly icon: string;
  readonly route: string;
}

const NAV_ITEMS: readonly AdminNavItem[] = [
  { label: 'Dashboard', icon: 'pi pi-chart-pie', route: '/admin/dashboard' },
  { label: 'Productos', icon: 'pi pi-box', route: '/admin/products' },
  { label: 'Inventario', icon: 'pi pi-warehouse', route: '/admin/inventory' },
  { label: 'Pedidos', icon: 'pi pi-receipt', route: '/admin/orders' },
  { label: 'POS', icon: 'pi pi-shopping-cart', route: '/admin/pos' },
  { label: 'Caja', icon: 'pi pi-dollar', route: '/admin/cash' },
  { label: 'Proveedores', icon: 'pi pi-truck', route: '/admin/suppliers' },
  { label: 'Reportes', icon: 'pi pi-chart-bar', route: '/admin/reports' },
  { label: 'Usuarios', icon: 'pi pi-users', route: '/admin/users' },
];

const LABEL_MAP: Record<string, string> = {
  dashboard: 'Dashboard',
  products: 'Productos',
  inventory: 'Inventario',
  orders: 'Pedidos',
  pos: 'POS',
  cash: 'Caja',
  suppliers: 'Proveedores',
  reports: 'Reportes',
  users: 'Usuarios',
};

@Component({
  selector: 'app-admin-layout',
  imports: [Avatar, Breadcrumb, Button, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
/** Provides the backoffice shell with collapsible sidebar, user topbar, and breadcrumbs. */
export class AdminLayout implements OnInit, OnDestroy {
  protected readonly collapsed = signal(false);
  protected readonly breadcrumbs = signal<MenuItem[]>([]);
  protected readonly navItems = NAV_ITEMS;

  private readonly destroy$ = new Subject<void>();
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.buildBreadcrumbs(this.router.url);
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe((e) => this.buildBreadcrumbs(e.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected toggleSidebar(): void {
    this.collapsed.update((v) => !v);
  }

  private buildBreadcrumbs(url: string): void {
    const parts = url.split('/').filter(Boolean);
    const items: MenuItem[] = [{ label: 'Admin', routerLink: '/admin/dashboard' }];
    for (const part of parts) {
      if (part === 'admin') continue;
      const label = LABEL_MAP[part] ?? part.charAt(0).toUpperCase() + part.slice(1);
      items.push({ label, routerLink: `/admin/${part}` });
    }
    this.breadcrumbs.set(items);
  }
}

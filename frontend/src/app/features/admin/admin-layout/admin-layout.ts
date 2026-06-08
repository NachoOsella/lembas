import { Component, OnDestroy, OnInit, inject, signal, computed } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';

import { AuthService } from '../../../core/services/auth';
import { AppToast } from '../../../shared/components/app-toast/app-toast';

interface AdminNavItem {
  readonly label: string;
  readonly icon: string;
  readonly route: string;
}

const NAV_ITEMS: readonly AdminNavItem[] = [
  { label: 'Dashboard', icon: 'pi pi-chart-pie', route: '/admin/dashboard' },
  { label: 'Categorias', icon: 'pi pi-tags', route: '/admin/categories' },
  { label: 'Productos', icon: 'pi pi-box', route: '/admin/products' },
  { label: 'Inventario', icon: 'pi pi-warehouse', route: '/admin/inventory' },
  { label: 'Recepciones', icon: 'pi pi-plus-circle', route: '/admin/receips' },
  { label: 'Pedidos', icon: 'pi pi-receipt', route: '/admin/orders' },
  { label: 'POS', icon: 'pi pi-shopping-cart', route: '/admin/pos' },
  { label: 'Caja', icon: 'pi pi-dollar', route: '/admin/cash' },
  { label: 'Proveedores', icon: 'pi pi-truck', route: '/admin/suppliers' },
  { label: 'Ordenes compra', icon: 'pi pi-file', route: '/admin/purchase-orders' },
  { label: 'Reportes', icon: 'pi pi-chart-bar', route: '/admin/reports' },
  { label: 'Usuarios', icon: 'pi pi-users', route: '/admin/users' },
];

const LABEL_MAP: Record<string, string> = {
  dashboard: 'Dashboard',
  categories: 'Categorias',
  products: 'Productos',
  inventory: 'Inventario',
  recepciones: 'Recepciones',
  orders: 'Pedidos',
  pos: 'POS',
  cash: 'Caja',
  suppliers: 'Proveedores',
  purchase: 'Compra',
  'purchase-orders': 'Ordenes de compra',
  reports: 'Reportes',
  users: 'Usuarios',
};

@Component({
  selector: 'app-admin-layout',
  imports: [MenuModule, RouterLink, RouterLinkActive, RouterOutlet, AppToast],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
/** Backoffice shell with Forest Green collapsible sidebar, breadcrumbs, and user menu. */
export class AdminLayout implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly collapsed = signal(false);
  protected readonly breadcrumbs = signal<MenuItem[]>([]);

  /** Sidebar nav items filtered by role: "Usuarios" is ADMIN-only. */
  protected readonly navItems = computed(() => {
    if (this.auth.getUserRole() === 'ADMIN') {
      return NAV_ITEMS;
    }
    return NAV_ITEMS.filter((item) => item.route !== '/admin/users');
  });

  /** Display name shown in the topbar. */
  protected readonly userDisplayName = computed(() => {
    const user = this.auth.currentUser();
    if (!user) return '';
    if (user.firstName) return user.firstName;
    return user.email;
  });

  /** Dropdown menu items for the user area. */
  protected readonly userMenuItems: MenuItem[] = [
    {
      label: 'Cerrar sesion',
      icon: 'pi pi-sign-out',
      command: () => this.logout(),
    },
  ];

  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      this.collapsed.set(true);
    }
    this.buildBreadcrumbs(this.router.url);
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe((e) => {
        this.buildBreadcrumbs(e.urlAfterRedirects);
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          this.collapsed.set(true);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Check if the given route matches the current URL for aria-current. */
  protected isActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  protected toggleSidebar(): void {
    this.collapsed.update((v) => !v);
  }

  /** Logs out the current user and redirects to login. */
  protected logout(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
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

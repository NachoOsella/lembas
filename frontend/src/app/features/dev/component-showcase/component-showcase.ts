import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import {
  TabItem,

  AppBadge,
  AppBreadcrumb,
  AppButton,
  AppDataTable,
  AppFieldHint,
  AppFormField,
  AppInput,
  AppModal,
  AppPageHeader,
  AppPagination,
  AppSearchBar,
  AppSectionCard,
  AppStatCard,
  AppTabs,
  AppToast,
  ColumnDef,
  ConfirmDialog,
  EmptyState,
  ErrorAlert,
  LoadingSpinner,
  Skeleton,
} from '../../../shared/components';

interface ShowcaseLink {
  readonly label: string;
  readonly path: string;
  readonly description: string;
}

@Component({
  selector: 'app-component-showcase',
  imports: [
    RouterLink,
    AppBadge,
    AppBreadcrumb,
    AppButton,
    AppDataTable,
    AppFieldHint,
    AppFormField,
    AppInput,
    AppModal,
    AppPageHeader,
    AppPagination,
    AppSearchBar,
    AppSectionCard,
    AppStatCard,
    AppTabs,
    AppToast,
    ConfirmDialog,
    EmptyState,
    ErrorAlert,
    LoadingSpinner,
    Skeleton,
  ],
  templateUrl: './component-showcase.html',
  styleUrl: './component-showcase.css',
})
/** Provides a development-only visual catalog for reusable components and app screens. */
export class ComponentShowcase {
  protected readonly dialogVisible = signal(false);
  protected readonly modalVisible = signal(false);
  protected readonly lastAction = signal('Todavia no ejecutaste ninguna accion.');
  protected readonly searchValue = signal('');
  protected readonly formValue = signal('');
  protected readonly formError = signal('');
  protected readonly activeTab = signal(0);
  protected readonly tableFirst = signal(0);

  protected readonly publicScreens: readonly ShowcaseLink[] = [
    { label: 'Catalogo publico', path: '/store', description: 'Listado principal de productos para clientes.' },
    { label: 'Login', path: '/auth/login', description: 'Acceso de clientes y administradores.' },
    { label: 'Registro', path: '/auth/register', description: 'Alta de nuevos clientes.' },
  ];

  protected readonly customerScreens: readonly ShowcaseLink[] = [
    { label: 'Perfil', path: '/customer/profile', description: 'Datos de cuenta del cliente.' },
    { label: 'Pedidos', path: '/customer/orders', description: 'Historial de compras y estados.' },
    { label: 'Checkout', path: '/customer/checkout', description: 'Confirmacion de retiro y pago online.' },
  ];

  protected readonly adminScreens: readonly ShowcaseLink[] = [
    { label: 'Dashboard', path: '/admin/dashboard', description: 'Resumen operativo.' },
    { label: 'Productos', path: '/admin/products', description: 'Gestion del catalogo.' },
    { label: 'Inventario', path: '/admin/inventory', description: 'Stock por lotes y vencimientos.' },
    { label: 'Pedidos', path: '/admin/orders', description: 'Administracion de ordenes.' },
    { label: 'POS', path: '/admin/pos', description: 'Venta presencial.' },
    { label: 'Caja', path: '/admin/cash', description: 'Apertura, cierre y arqueo fisico.' },
    { label: 'Proveedores', path: '/admin/suppliers', description: 'Compras y abastecimiento.' },
    { label: 'Reportes', path: '/admin/reports', description: 'Indicadores de gestion.' },
    { label: 'Usuarios', path: '/admin/users', description: 'Gestion de roles y accesos.' },
  ];

  protected readonly breadcrumbItems: MenuItem[] = [
    { label: 'Tienda', routerLink: '/store' },
    { label: 'Productos', routerLink: '/store' },
    { label: 'Granola artesanal' },
  ];

  protected readonly tabItems: TabItem[] = [
    { label: 'General', icon: 'pi pi-home' },
    { label: 'Pedidos', icon: 'pi pi-receipt' },
    { label: 'Inventario', icon: 'pi pi-box' },
  ];

  protected readonly tableColumns: ColumnDef[] = [
    { field: 'name', header: 'Producto', sortable: true },
    { field: 'category', header: 'Categoria', sortable: true },
    { field: 'price', header: 'Precio', sortable: true, width: '8rem' },
    { field: 'stock', header: 'Stock', sortable: true, width: '6rem' },
  ];

  protected readonly tableData = [
    { name: 'Granola artesanal', category: 'Cereales', price: '$1.200', stock: 45 },
    { name: 'Miel organica', category: 'Endulzantes', price: '$850', stock: 32 },
    { name: 'Almendras tostadas', category: 'Frutos secos', price: '$2.100', stock: 18 },
    { name: 'Yerba mate premium', category: 'Bebidas', price: '$1.450', stock: 67 },
    { name: 'Chia organica', category: 'Semillas', price: '$780', stock: 12 },
  ];

  /** Opens the confirmation dialog demo. */
  protected openDialog(): void {
    this.dialogVisible.set(true);
  }

  /** Opens the generic modal demo. */
  protected openModal(): void {
    this.modalVisible.set(true);
  }

  /** Records a successful confirmation from the dialog demo. */
  protected confirmDialog(): void {
    this.dialogVisible.set(false);
    this.lastAction.set('Confirmaste la accion de ejemplo.');
  }

  /** Records a cancellation from the dialog demo. */
  protected cancelDialog(): void {
    this.dialogVisible.set(false);
    this.lastAction.set('Cancelaste el dialogo de ejemplo.');
  }

  /** Records the empty-state action demo. */
  protected handleEmptyAction(): void {
    this.lastAction.set('Ejecutaste la accion del EmptyState.');
  }

  /** Records the error-alert dismiss demo. */
  protected handleAlertDismiss(): void {
    this.lastAction.set('Cerraste la alerta de error.');
  }

  /** Records search input changes. */
  protected handleSearch(value: string): void {
    this.lastAction.set(`Buscaste: "${value}"`);
  }

  /** Records search clear. */
  protected handleSearchClear(): void {
    this.lastAction.set('Limpiaste la busqueda.');
  }

  /** Records tab changes. */
  protected handleTabChange(index: number): void {
    this.activeTab.set(index);
    this.lastAction.set(`Cambiaste a la pestana: ${this.tabItems[index]?.label}`);
  }

  /** Records pagination changes. */
  protected handlePageChange(event: { first: number; rows: number }): void {
    this.tableFirst.set(event.first);
    this.lastAction.set(`Pagina: ${Math.floor(event.first / event.rows) + 1}`);
  }

  /** Validates the demo form field. */
  protected validateForm(): void {
    if (!this.formValue()) {
      this.formError.set('Este campo es obligatorio.');
    } else {
      this.formError.set('');
      this.lastAction.set(`Valor ingresado: "${this.formValue()}"`);
    }
  }
}

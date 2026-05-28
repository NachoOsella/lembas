import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonDirective } from 'primeng/button';
import { Ripple } from 'primeng/ripple';
import {
  TabItem,
  AppBadge,
  AppBreadcrumb,
  AppButton,
  CardBanner,
  AppDataTable,
  AppFieldHint,
  AppFormField,
  AppInput,
  AppMetricItem,
  AppModal,
  AppPageHeader,
  AppPagination,
  AppSearchBar,
  AppSectionCard,
  AppStatCard,
  AppStoreFooter,
  AppStoreNav,
  StoreBrandConfig,
  StoreFooterLink,
  AppTabs,
  AppToast,
  ColumnDef,
  ConfirmDialog,
  EmptyState,
  ErrorAlert,
  LoadingSpinner,
  Skeleton,
  StoreProductCard,
} from '../../../shared/components';
import { ProductSummary } from '../../../shared/models/product';

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
    CardBanner,
    ButtonDirective,
    AppDataTable,
    AppFieldHint,
    AppFormField,
    AppInput,
    AppModal,
    AppPageHeader,
    AppPagination,
    Ripple,
    AppSearchBar,
    AppSectionCard,
    AppStatCard,
    AppStoreFooter,
    AppStoreNav,
    AppTabs,
    AppToast,
    ConfirmDialog,
    EmptyState,
    ErrorAlert,
    LoadingSpinner,
    Skeleton,
    StoreProductCard,
  ],
  templateUrl: './component-showcase.html',
  styleUrl: './component-showcase.css',
})
/** Provides a development-only visual catalog for reusable components and app screens. */
export class ComponentShowcase {
  private readonly messageService = inject(MessageService);

  protected readonly dialogVisible = signal(false);
  protected readonly modalVisible = signal(false);
  protected readonly lastAction = signal('Todavia no ejecutaste ninguna accion.');
  protected readonly searchValue = signal('');
  protected readonly formValue = signal('');
  protected readonly formError = signal('');
  protected readonly activeTab = signal(0);
  protected readonly tableFirst = signal(0);

  protected readonly publicScreens: readonly ShowcaseLink[] = [
    {
      label: 'Catalogo publico',
      path: '/store',
      description: 'Listado principal de productos para clientes.',
    },
    { label: 'Login', path: '/auth/login', description: 'Acceso de clientes y administradores.' },
    { label: 'Registro', path: '/auth/register', description: 'Alta de nuevos clientes.' },
  ];

  protected readonly customerScreens: readonly ShowcaseLink[] = [
    { label: 'Perfil', path: '/customer/profile', description: 'Datos de cuenta del cliente.' },
    { label: 'Pedidos', path: '/customer/orders', description: 'Historial de compras y estados.' },
    {
      label: 'Checkout',
      path: '/customer/checkout',
      description: 'Confirmacion de retiro y pago online.',
    },
  ];

  protected readonly adminScreens: readonly ShowcaseLink[] = [
    { label: 'Dashboard', path: '/admin/dashboard', description: 'Resumen operativo.' },
    { label: 'Productos', path: '/admin/products', description: 'Gestion del catalogo.' },
    {
      label: 'Inventario',
      path: '/admin/inventory',
      description: 'Stock por lotes y vencimientos.',
    },
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

  // ---------------------------------------------------------------------------
  // Section Card demo
  // ---------------------------------------------------------------------------
  protected readonly sectionCardTones = ['surface', 'muted', 'dark'] as const;

  // ---------------------------------------------------------------------------
  // Metrics demo
  // ---------------------------------------------------------------------------
  protected readonly showcaseMetrics: AppMetricItem[] = [
    { label: 'Ventas hoy', value: '$12.450', detail: '+12% vs ayer', icon: 'pi pi-shopping-cart', tone: 'forest', trend: 'up' },
    { label: 'Pedidos pendientes', value: '8', detail: '3 requieren atencion', icon: 'pi pi-clock', tone: 'amber', trend: 'neutral' },
    { label: 'Stock critico', value: '5', detail: 'productos por reponer', icon: 'pi pi-exclamation-triangle', tone: 'ink', trend: 'down' },
    { label: 'Clientes nuevos', value: '+23', detail: 'este mes', icon: 'pi pi-user-plus', tone: 'sage', trend: 'up' },
  ];

  // ---------------------------------------------------------------------------
  // Store product card demo
  // ---------------------------------------------------------------------------
  protected readonly sampleProduct: ProductSummary = {
    id: 1,
    name: 'Granola artesanal con almendras',
    description: 'Granola crocante horneada con miel organica, almendras y coco.',
    brandName: 'Lembas',
    salePrice: 1200,
    onlineStatus: 'PUBLISHED',
    imageUrl: undefined,
    availableStock: 45,
    categoryId: 1,
    categoryName: 'Cereales',
  };

  protected readonly sampleProductCompact: ProductSummary = {
    ...this.sampleProduct,
    id: 2,
    name: 'Miel organica de montana',
    brandName: 'Colmenar del Valle',
    salePrice: 850,
    categoryName: 'Endulzantes',
  };

  // ---------------------------------------------------------------------------
  // Store nav / footer demo
  // ---------------------------------------------------------------------------
  protected readonly brandConfig: StoreBrandConfig = {
    logoUrl: '/brand/lembas-icon.svg',
    title: 'Dietetica Lembas',
    subtitle: 'Naturaleza en casa',
    homeRoute: '/store',
  };

  protected readonly storeUserMenuItems: MenuItem[] = [
    { label: 'Mi perfil', icon: 'pi pi-user', routerLink: '/customer/profile' },
    { label: 'Mis pedidos', icon: 'pi pi-receipt', routerLink: '/customer/orders' },
    { separator: true },
    { label: 'Cerrar sesion', icon: 'pi pi-sign-out' },
  ];

  protected readonly footerLinks: StoreFooterLink[] = [
    { label: 'Terminos y condiciones', path: '/terminos' },
    { label: 'Politica de privacidad', path: '/privacidad' },
    { label: 'Contacto', path: '/contacto' },
    { label: '@lembasok', path: 'https://instagram.com/lembasok', external: true },
  ];

  protected readonly footerCopyright = '2026 Dietetica Lembas. Todos los derechos reservados.';

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
    { field: 'status', header: 'Estado', sortable: false, width: '8rem' },
    { field: 'actions', header: 'Acciones', sortable: false, width: '7rem' },
  ];

  /** Product row shape used by the showcase table. */
  protected readonly tableData = [
    { name: 'Granola artesanal', category: 'Cereales', price: '$1.200', stock: 45, status: 'PUBLISHED' },
    { name: 'Miel organica', category: 'Endulzantes', price: '$850', stock: 32, status: 'PUBLISHED' },
    { name: 'Almendras tostadas', category: 'Frutos secos', price: '$2.100', stock: 18, status: 'PAUSED' },
    { name: 'Yerba mate premium', category: 'Bebidas', price: '$1.450', stock: 67, status: 'PUBLISHED' },
    { name: 'Chia organica', category: 'Semillas', price: '$780', stock: 12, status: 'DRAFT' },
  ];

  /** Maps a status to a badge tone for the table demo. */
  protected tableStatusTone(status: string): 'success' | 'warning' | 'neutral' {
    if (status === 'PUBLISHED') return 'success';
    if (status === 'PAUSED') return 'warning';
    return 'neutral';
  }

  protected tableActions(row: unknown): void {
    this.lastAction.set(`Editar: ${(row as Record<string, string>)['name']}`);
  }

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

  // ---------------------------------------------------------------------------
  // Toast demo
  // ---------------------------------------------------------------------------

  /** Shows a success toast. */
  protected showToastSuccess(): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Exito',
      detail: 'Archivo subido correctamente',
      life: 4000,
    });
    this.lastAction.set('Toast de exito enviado.');
  }

  /** Shows an error toast. */
  protected showToastError(): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Error al eliminar',
      detail: 'No se puede eliminar una categoria que tiene subcategorias. Elimina primero las subcategorias.',
      life: 5000,
    });
    this.lastAction.set('Toast de error enviado.');
  }

  /** Shows a warning toast. */
  protected showToastWarn(): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Advertencia',
      detail: 'Stock bajo para: Harina integral (3 unidades)',
      life: 4500,
    });
    this.lastAction.set('Toast de advertencia enviado.');
  }

  /** Shows an info toast. */
  protected showToastInfo(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Informacion',
      detail: 'Nuevo mensaje de tu proveedor favorito',
      life: 4000,
    });
    this.lastAction.set('Toast de informacion enviado.');
  }

  /** Shows all four toast types in sequence. */
  protected showToastAll(): void {
    this.showToastSuccess();
    setTimeout(() => this.showToastWarn(), 300);
    setTimeout(() => this.showToastInfo(), 600);
    setTimeout(() => this.showToastError(), 900);
    this.lastAction.set('Enviando los 4 tipos de toast...');
  }
}

import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ConfirmDialog, EmptyState, ErrorAlert, LoadingSpinner, Skeleton } from '../../../shared/components';

interface ShowcaseLink {
  readonly label: string;
  readonly path: string;
  readonly description: string;
}

@Component({
  selector: 'app-component-showcase',
  imports: [RouterLink, ConfirmDialog, EmptyState, ErrorAlert, LoadingSpinner, Skeleton],
  templateUrl: './component-showcase.html',
  styleUrl: './component-showcase.css',
})
/** Provides a development-only visual catalog for reusable components and app screens. */
export class ComponentShowcase {
  protected readonly dialogVisible = signal(false);
  protected readonly lastAction = signal('Todavia no ejecutaste ninguna accion.');

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

  /** Opens the confirmation dialog demo. */
  protected openDialog(): void {
    this.dialogVisible.set(true);
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
}

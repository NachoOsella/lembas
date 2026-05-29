import { StatusBadgeConfig } from '../components/status-badge/status-badge';
import { ProductOnlineStatus } from './product';

/** Badge configuration for each product online status. */
export const PRODUCT_STATUS_BADGES: Record<ProductOnlineStatus, StatusBadgeConfig> = {
  DRAFT: {
    label: 'Borrador',
    tone: 'neutral',
    icon: 'pi pi-pencil',
  },
  PUBLISHED: {
    label: 'Publicado',
    tone: 'success',
    icon: 'pi pi-check-circle',
  },
  PAUSED: {
    label: 'Pausado',
    tone: 'warning',
    icon: 'pi pi-pause-circle',
  },
  HIDDEN: {
    label: 'Oculto',
    tone: 'danger',
    icon: 'pi pi-eye-slash',
  },
};

/** A status transition action shown in the product list menu. */
export interface ProductStatusAction {
  readonly targetStatus: ProductOnlineStatus;
  readonly label: string;
  readonly icon: string;
  readonly severity?: 'success' | 'warn' | 'danger' | 'secondary';
}

/**
 * Allowed status transitions per current status (mirrors backend ``canTransitionTo``).
 * Kept for reference and backend validation context.
 */
export const PRODUCT_STATUS_ACTIONS: Record<ProductOnlineStatus, readonly ProductStatusAction[]> = {
  DRAFT: [
    {
      targetStatus: 'PUBLISHED',
      label: 'Publicar',
      icon: 'pi pi-check-circle',
      severity: 'success',
    },
  ],
  PUBLISHED: [
    { targetStatus: 'PAUSED', label: 'Pausar', icon: 'pi pi-pause-circle', severity: 'warn' },
  ],
  PAUSED: [
    {
      targetStatus: 'PUBLISHED',
      label: 'Republicar',
      icon: 'pi pi-check-circle',
      severity: 'success',
    },
    { targetStatus: 'HIDDEN', label: 'Ocultar', icon: 'pi pi-eye-slash', severity: 'danger' },
  ],
  HIDDEN: [
    {
      targetStatus: 'PAUSED',
      label: 'Restaurar como pausado',
      icon: 'pi pi-undo',
      severity: 'secondary',
    },
  ],
};

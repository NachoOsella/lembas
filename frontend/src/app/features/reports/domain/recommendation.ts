/**
 * DTOs matching the backend {@code com.dietetica.lembas.reports.dto.RecommendationDto}
 * (S4-US06).
 */

/** Rule type. The id is composed as {@code <type>-<productId>}. */
export type RecommendationType = 'LOW_STOCK' | 'EXPIRING_SOON' | 'HIGH_ROTATION' | 'NO_MOVEMENT';

/** Severity level. The dashboard sort uses {@code HIGH > MEDIUM > LOW}. */
export type RecommendationUrgency = 'HIGH' | 'MEDIUM' | 'LOW';

/** Single rule-based recommendation entry. */
export interface RecommendationDto {
  /** Composite id, e.g. {@code LOW_STOCK-42}. */
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  urgency: RecommendationUrgency;
  iconName: string;
  link: string;
  actionLabel: string;
  productId: number;
  productName: string;
  categoryId: number | null;
  categoryName: string | null;
  barcode: string | null;
  /** LOW_STOCK fields. */
  currentStock?: number | null;
  minimumStock?: number | null;
  /** EXPIRING_SOON fields. */
  expirationDate?: string | null;
  stockLotId?: number | null;
  lotCode?: string | null;
  lotQuantity?: number | null;
  /** HIGH_ROTATION fields. */
  last7DaysSales?: number | null;
  /** NO_MOVEMENT fields. */
  daysWithoutSales?: number | null;
  generatedAt: string;
}

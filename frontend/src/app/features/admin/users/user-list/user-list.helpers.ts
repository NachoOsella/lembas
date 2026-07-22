import type { UserResponse } from '@features/users/domain/user';

export type UserBadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const ROLE_TONES: Record<string, UserBadgeTone> = {
  ADMIN: 'info',
  MANAGER: 'warning',
  EMPLOYEE: 'success',
  CUSTOMER: 'neutral',
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  EMPLOYEE: 'Empleado',
  CUSTOMER: 'Cliente',
};

const USER_SORT_FIELDS = new Set(['firstName', 'email', 'role', 'enabled']);

export function buildUserSort(
  field: string | undefined,
  order: number | undefined,
): string | undefined {
  if (!field || !USER_SORT_FIELDS.has(field) || ![1, -1].includes(order ?? 0)) {
    return undefined;
  }
  return `${field},${order === 1 ? 'asc' : 'desc'}`;
}

export function userRoleTone(role: string): UserBadgeTone {
  return ROLE_TONES[role] ?? 'neutral';
}

export function userRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export function userEmptyDescription(query: string): string {
  const normalizedQuery = query.trim();
  return normalizedQuery
    ? `No se encontraron usuarios que coincidan con "${normalizedQuery}".`
    : 'Cree el primer usuario interno para comenzar.';
}

/** Keeps the list helper's display contract tied to the user row shape. */
export function userDisplayName(user: Pick<UserResponse, 'firstName' | 'lastName'>): string {
  return [user.firstName, user.lastName].filter(Boolean).join(' ');
}

import {
  buildUserSort,
  userEmptyDescription,
  userRoleLabel,
  userRoleTone,
} from './user-list.helpers';

describe('user list helpers', () => {
  it('accepts supported sort fields and rejects unsafe table fields', () => {
    expect(buildUserSort('email', -1)).toBe('email,desc');
    expect(buildUserSort('branchId', 1)).toBeUndefined();
  });

  it('maps roles and empty states to controlled presentation copy', () => {
    expect(userRoleLabel('MANAGER')).toBe('Gerente');
    expect(userRoleTone('unknown')).toBe('neutral');
    expect(userEmptyDescription(' missing ')).toContain('missing');
  });
});

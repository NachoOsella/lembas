import { adminGuard } from './admin-guard';

/**
 * Admin guard re-exports from the unified auth-guard module.
 * Full behavioral tests live in auth-guard.spec.ts.
 */
describe('adminGuard (re-export)', () => {
  it('should be defined', () => {
    expect(adminGuard).toBeDefined();
  });
});

import { customerGuard } from './customer-guard';

/**
 * Customer guard re-exports from the unified auth-guard module.
 * Full behavioral tests live in auth-guard.spec.ts.
 */
describe('customerGuard (re-export)', () => {
  it('should be defined', () => {
    expect(customerGuard).toBeDefined();
  });
});

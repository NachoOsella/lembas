import { routes } from './app.routes';

describe('application routes', () => {
  it('does not expose the development component showcase in production routes', () => {
    expect(routes.some((route) => route.path === 'dev/ui')).toBe(false);
  });
});

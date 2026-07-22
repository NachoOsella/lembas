# Frontend

Dietetica Lembas frontend application. Built with Angular 21.2 standalone components, Signals, PrimeNG 21.1 Aura, and Tailwind CSS 4. Tested with Vitest 4 + jsdom 28.

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 18+ (verified: 22.14) |
| npm | 10+ (verified: 11.14.1) |
| Angular CLI | 21.2.11 |

## Quick start

```bash
npm ci
npm start
```

The app runs at `http://localhost:4200/` and proxies `/api` requests to `http://localhost:8080` via `proxy.conf.json`.

## Commands

| Command | Description |
|---|---|
| `npm start` | Start development server |
| `npm run build` | Production build |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run verify` | Format check + lint + typecheck + test + build |
| `npm run lint` | Run ESLint |
| `npm run format:check` | Check Prettier formatting |
| `npm run boundaries` | Verify feature-boundary import rules |
| `npm run docker:up` | Start only PostgreSQL via Docker |
| `npm run docker:down` | Stop PostgreSQL container |

## Project structure

```text
src/app/
  core/           -- Auth, interceptors, guards, services
  shared/         -- Reusable UI components, pipes, models
  features/       -- Feature slices (admin, auth, public-store, etc.)
    <feature>/    -- Each feature exports public-api.ts
```

## Feature boundaries

Cross-feature imports are restricted by the `scripts/check-feature-boundaries.mjs` script. A feature may only import another feature through its `public-api.ts`. Run `npm run boundaries` to verify.

## Testing

- Unit tests use Vitest 4 with jsdom 28 environment.
- Components are tested through TestBed with standalone imports.
- HTTP calls are mocked with `HttpClientTestingController`.
- All components handle loading, empty, error, and data states.

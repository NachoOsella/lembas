import { HttpErrorResponse } from '@angular/common/http';

import { getApiError } from './api-error';

describe('getApiError', () => {
  it('returns a normalized backend error contract', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: {
          fieldErrors: [
            { field: 'email', message: 'must be valid' },
            { field: 123, message: 'invalid malformed entry' },
          ],
        },
        timestamp: '2026-07-18T10:00:00Z',
        path: '/api/auth/register',
      },
    });

    expect(getApiError(error)).toEqual({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: { fieldErrors: [{ field: 'email', message: 'must be valid' }] },
      timestamp: '2026-07-18T10:00:00Z',
      path: '/api/auth/register',
    });
  });

  it.each([
    null,
    'network failure',
    new Error('unexpected'),
    new HttpErrorResponse({ status: 500, error: null }),
    new HttpErrorResponse({ status: 500, error: { code: 'INTERNAL_ERROR' } }),
    new HttpErrorResponse({
      status: 500,
      error: { status: '500', code: 'INTERNAL_ERROR', message: 'failure' },
    }),
  ])('rejects malformed error payload %#', (error) => {
    expect(getApiError(error)).toBeNull();
  });
});

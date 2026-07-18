/**
 * Shared API error types matching the backend error response contract.
 *
 * These types define the structure of error responses from the Spring Boot backend,
 * ensuring consistent error handling across all frontend components.
 */

import { HttpErrorResponse } from '@angular/common/http';

/**
 * Field-level validation error returned inside ApiError.details.fieldErrors.
 *
 * Each entry represents a single validation failure for a specific field,
 * with a machine-readable field name and a human-readable message.
 */
export interface ApiFieldError {
  field: string;
  message: string;
}

/**
 * Standard API error response from the backend.
 *
 * This matches the backend's ApiError record structure and is used for all
 * error responses from the Spring Boot application.
 */
export interface ApiErrorResponse {
  status: number;
  code: string;
  message: string;
  details?: {
    fieldErrors?: ApiFieldError[];
  } | null;
  timestamp?: string;
  path?: string;
}

/**
 * Safely extracts the backend API error payload from an unknown error.
 *
 * Returns null if the error is not an HttpErrorResponse or doesn't contain
 * a valid API error structure. This prevents unsafe casts and centralizes
 * error extraction logic.
 *
 * @param error - The unknown error object (typically from an Observable error handler)
 * @returns The typed API error response, or null if extraction fails
 */
export function getApiError(error: unknown): ApiErrorResponse | null {
  if (!(error instanceof HttpErrorResponse) || !isRecord(error.error)) {
    return null;
  }

  const payload = error.error;
  if (
    typeof payload['status'] !== 'number' ||
    !Number.isInteger(payload['status']) ||
    typeof payload['code'] !== 'string' ||
    payload['code'].length === 0 ||
    typeof payload['message'] !== 'string'
  ) {
    return null;
  }

  return {
    status: payload['status'],
    code: payload['code'],
    message: payload['message'],
    details: parseDetails(payload['details']),
    timestamp: optionalString(payload['timestamp']),
    path: optionalString(payload['path']),
  };
}

function parseDetails(value: unknown): ApiErrorResponse['details'] {
  if (value === null || value === undefined) {
    return null;
  }
  if (!isRecord(value) || !Array.isArray(value['fieldErrors'])) {
    return null;
  }

  const fieldErrors = value['fieldErrors'].filter(isApiFieldError);
  return { fieldErrors };
}

function isApiFieldError(value: unknown): value is ApiFieldError {
  return (
    isRecord(value) && typeof value['field'] === 'string' && typeof value['message'] === 'string'
  );
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

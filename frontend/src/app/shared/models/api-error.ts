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
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }

  return error.error as ApiErrorResponse | null;
}

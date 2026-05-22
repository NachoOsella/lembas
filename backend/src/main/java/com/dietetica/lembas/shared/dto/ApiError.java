package com.dietetica.lembas.shared.dto;

import java.time.Instant;

/**
 * Standard API error payload returned by the global exception handler.
 *
 * @param status    the HTTP status code
 * @param code      the machine-readable error code
 * @param message   the human-readable error message
 * @param details   optional contextual error details
 * @param timestamp the time when the error response was created
 * @param path      the request path that caused the error
 */
public record ApiError(
        int status,
        String code,
        String message,
        Object details,
        Instant timestamp,
        String path
) {
}

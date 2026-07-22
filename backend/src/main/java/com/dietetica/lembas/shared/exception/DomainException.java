package com.dietetica.lembas.shared.exception;

import org.springframework.http.HttpStatus;

/**
 * Base exception for domain rule violations.
 *
 * <p>All business-logic exceptions should extend this class, providing a
 * machine-readable {@code code} and an HTTP {@code status}. The global
 * {@code @ControllerAdvice} catches these and returns a uniform
 * {@code ApiError} JSON response.</p>
 *
 * <p>Common error codes (see {@code docs/05-api/error-handling.md}):</p>
 * <ul>
 *   <li>{@code EMAIL_DUPLICATED} — 409 Conflict</li>
 *   <li>{@code INVALID_CREDENTIALS} — 401 Unauthorized</li>
 *   <li>{@code ACCOUNT_DISABLED} — 403 Forbidden</li>
 *   <li>{@code INSUFFICIENT_STOCK} — 409 Conflict</li>
 *   <li>{@code ORDER_INVALID_STATE} — 409 Conflict</li>
 * </ul>
 */
public class DomainException extends RuntimeException {

    private final String code;
    private final HttpStatus status;

    /**
     * Creates a domain exception with a machine-readable code and HTTP status.
     *
     * @param code    the error code, e.g. {@code EMAIL_DUPLICATED}
     * @param status  the HTTP response status
     * @param message a human-readable description of the violation
     */
    public DomainException(String code, HttpStatus status, String message) {
        super(message);
        this.code = code;
        this.status = status;
    }

    /**
     * Creates a domain exception with a default {@code 400 Bad Request} status.
     *
     * @param code    the error code, e.g. {@code VALIDATION_ERROR}
     * @param message a human-readable description of the violation
     */
    public DomainException(String code, String message) {
        this(code, HttpStatus.BAD_REQUEST, message);
    }

    /**
     * Returns the machine-readable error code for API responses.
     *
     * @return the error code, e.g. {@code EMAIL_DUPLICATED}
     */
    public String getCode() {
        return code;
    }

    /**
     * Returns the HTTP status that should be returned to the client.
     *
     * @return the HTTP status
     */
    public HttpStatus getStatus() {
        return status;
    }
}

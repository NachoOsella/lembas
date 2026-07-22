package com.dietetica.lembas.shared.web;

import com.dietetica.lembas.shared.dto.ApiError;
import com.dietetica.lembas.shared.dto.ApiError.FieldError;
import com.dietetica.lembas.shared.dto.ApiError.ValidationDetails;
import com.dietetica.lembas.shared.exception.DomainException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Converts application exceptions into the documented uniform {@link ApiError} format.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Handles business-rule failures raised by services and domain policies.
     */
    @ExceptionHandler(DomainException.class)
    public ResponseEntity<ApiError> handleDomainException(DomainException exception, HttpServletRequest request) {
        ApiError error = buildError(exception.getStatus(), exception.getCode(), exception.getMessage(), null, request);
        return ResponseEntity.status(exception.getStatus()).body(error);
    }

    /**
     * Handles Bean Validation failures on request DTOs and returns field-level details.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidationException(
            MethodArgumentNotValidException exception, HttpServletRequest request) {
        List<FieldError> fieldErrors = exception.getBindingResult().getFieldErrors().stream()
                .map(fieldError -> new FieldError(fieldError.getField(), fieldError.getDefaultMessage()))
                .toList();

        ApiError error = buildError(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                "Validation failed",
                new ValidationDetails(fieldErrors),
                request);
        return ResponseEntity.badRequest().body(error);
    }

    /**
     * Handles validation failures raised from method-level constraints.
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> handleConstraintViolationException(
            ConstraintViolationException exception, HttpServletRequest request) {
        List<FieldError> fieldErrors = exception.getConstraintViolations().stream()
                .map(violation -> new FieldError(violation.getPropertyPath().toString(), violation.getMessage()))
                .toList();

        ApiError error = buildError(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                "Validation failed",
                new ValidationDetails(fieldErrors),
                request);
        return ResponseEntity.badRequest().body(error);
    }

    /**
     * Handles malformed JSON or incompatible request body payloads.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleUnreadableMessage(
            HttpMessageNotReadableException exception, HttpServletRequest request) {
        ApiError error = buildError(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                "Malformed request body",
                new ValidationDetails(List.of()),
                request);
        return ResponseEntity.badRequest().body(error);
    }

    /**
     * Handles relational and unique-constraint conflicts raised by the database.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> handleDataIntegrityViolation(
            DataIntegrityViolationException exception, HttpServletRequest request) {
        Throwable cause = exception.getMostSpecificCause();
        String causeMessage = cause != null ? cause.getMessage() : exception.getMessage();
        log.warn("Data integrity violation path={} cause={}", request.getRequestURI(), causeMessage);

        ApiError error = buildError(
                HttpStatus.CONFLICT,
                "DATA_INTEGRITY_VIOLATION",
                "Request conflicts with existing or related data",
                null,
                request);
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    /**
     * Handles authenticated users that do not have enough permissions.
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException exception, HttpServletRequest request) {
        ApiError error = buildError(HttpStatus.FORBIDDEN, "ACCESS_DENIED", "Access denied", null, request);
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    /**
     * Handles unauthenticated requests to protected resources.
     */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiError> handleAuthentication(
            AuthenticationException exception, HttpServletRequest request) {
        ApiError error = buildError(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required", null, request);
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    /**
     * Handles unexpected failures without exposing implementation details to API clients.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpectedException(Exception exception, HttpServletRequest request) {
        log.error("Unhandled API exception path={}", request.getRequestURI(), exception);
        ApiError error = buildError(
                HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "An unexpected error occurred", null, request);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    /**
     * Builds a standard error payload for a request path.
     */
    private ApiError buildError(
            HttpStatus status, String code, String message, Object details, HttpServletRequest request) {
        return new ApiError(status.value(), code, message, details, Instant.now(), request.getRequestURI());
    }
}

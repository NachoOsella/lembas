package com.dietetica.lembas.shared.web;

import com.dietetica.lembas.shared.dto.ApiError;
import com.dietetica.lembas.shared.exception.DomainException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for the global API error mapping.
 */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    /**
     * Verifies that domain exceptions preserve their documented code and status.
     */
    @Test
    void handleDomainExceptionReturnsApiErrorWithDomainCode() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/register");
        DomainException exception = new DomainException(
                "EMAIL_DUPLICATED",
                HttpStatus.CONFLICT,
                "An account with this email address already exists"
        );

        ResponseEntity<ApiError> response = handler.handleDomainException(exception, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo(409);
        assertThat(response.getBody().code()).isEqualTo("EMAIL_DUPLICATED");
        assertThat(response.getBody().message()).isEqualTo("An account with this email address already exists");
        assertThat(response.getBody().path()).isEqualTo("/api/auth/register");
        assertThat(response.getBody().timestamp()).isNotNull();
    }

    /**
     * Verifies that unexpected exceptions do not expose internal exception messages.
     */
    @Test
    void handleUnexpectedExceptionReturnsGenericInternalError() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/admin/products");
        RuntimeException exception = new RuntimeException("sensitive implementation details");

        ResponseEntity<ApiError> response = handler.handleUnexpectedException(exception, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo(500);
        assertThat(response.getBody().code()).isEqualTo("INTERNAL_ERROR");
        assertThat(response.getBody().message()).isEqualTo("An unexpected error occurred");
        assertThat(response.getBody().path()).isEqualTo("/api/admin/products");
    }
}

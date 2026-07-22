package com.dietetica.lembas.shared.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.dietetica.lembas.shared.exception.DomainException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** MVC contract tests for every centrally normalized exception category. */
class GlobalExceptionHandlerMvcTest {

    private final MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new ErrorProbeController())
            .setControllerAdvice(new GlobalExceptionHandler())
            .setValidator(createValidator())
            .build();

    private static LocalValidatorFactoryBean createValidator() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        return validator;
    }

    @Test
    void domainExceptionPreservesStableCodeStatusAndMessage() throws Exception {
        mockMvc.perform(post("/probe/domain"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.code").value("PROBE_CONFLICT"))
                .andExpect(jsonPath("$.message").value("A domain rule failed"))
                .andExpect(jsonPath("$.details").doesNotExist());
    }

    @Test
    void validationUsesStableFieldErrorsDetailsShape() throws Exception {
        mockMvc.perform(post("/probe/validation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details.fieldErrors").isArray())
                .andExpect(jsonPath("$.details.fieldErrors[0].field").value("name"))
                .andExpect(jsonPath("$.details.fieldErrors[0].message").isNotEmpty());
    }

    @Test
    void accessDeniedIsNormalizedWithoutExceptionMessage() throws Exception {
        mockMvc.perform(post("/probe/access-denied"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"))
                .andExpect(jsonPath("$.message").value("Access denied"))
                .andExpect(jsonPath("$.details").doesNotExist());
    }

    @Test
    void authenticationFailureIsNormalizedWithoutExceptionMessage() throws Exception {
        mockMvc.perform(post("/probe/authentication"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.message").value("Authentication required"));
    }

    @Test
    void malformedJsonUsesTheSameValidationDetailsShape() throws Exception {
        mockMvc.perform(post("/probe/validation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("Malformed request body"))
                .andExpect(jsonPath("$.details.fieldErrors").isArray())
                .andExpect(jsonPath("$.details.fieldErrors").isEmpty());
    }

    @Test
    void unexpectedFailureNeverExposesRawExceptionMessage() throws Exception {
        mockMvc.perform(post("/probe/unexpected"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.message").value("An unexpected error occurred"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.not("sensitive internal details")));
    }

    @RestController
    @RequestMapping("/probe")
    static class ErrorProbeController {

        @PostMapping("/domain")
        void domain() {
            throw new DomainException("PROBE_CONFLICT", HttpStatus.CONFLICT, "A domain rule failed");
        }

        @PostMapping("/validation")
        void validation(@Valid @RequestBody ProbeRequest request) {
            // The handler contract is exercised before the controller needs the request.
        }

        @PostMapping("/access-denied")
        void accessDenied() {
            throw new AccessDeniedException("sensitive authorization details");
        }

        @PostMapping("/authentication")
        void authentication() {
            throw new BadCredentialsException("sensitive authentication details");
        }

        @PostMapping("/unexpected")
        void unexpected() {
            throw new IllegalStateException("sensitive internal details");
        }
    }

    record ProbeRequest(@NotBlank String name) {}
}

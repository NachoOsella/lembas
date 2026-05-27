package com.dietetica.lembas.auth.web;

import com.dietetica.lembas.auth.dto.AuthResponse;
import com.dietetica.lembas.auth.dto.LoginRequest;
import com.dietetica.lembas.auth.dto.RefreshTokenRequest;
import com.dietetica.lembas.auth.dto.RegisterRequest;
import com.dietetica.lembas.auth.dto.UserDto;
import com.dietetica.lembas.auth.service.AuthService;
import com.dietetica.lembas.auth.service.JwtAuthenticationFilter;
import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.shared.web.GlobalExceptionHandler;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * MVC slice tests for the public authentication controller.
 */
@WebMvcTest(controllers = {AuthController.class, GlobalExceptionHandler.class})
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private SecurityContextHelper securityContextHelper;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    /**
     * Verifies that a valid registration request delegates to the service and returns 201.
     */
    @Test
    void Should_returnCreatedAuthResponse_when_registerRequestIsValid() throws Exception {
        AuthResponse response = new AuthResponse(
                "access-token",
                "refresh-token",
                new UserDto(1L, "frodo@lembas.com", "Frodo", "Baggins", Role.CUSTOMER, null, null)
        );
        when(authService.registerCustomer(any(RegisterRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").value("access-token"))
                .andExpect(jsonPath("$.refreshToken").value("refresh-token"))
                .andExpect(jsonPath("$.user.id").value(1))
                .andExpect(jsonPath("$.user.email").value("frodo@lembas.com"))
                .andExpect(jsonPath("$.user.role").value("CUSTOMER"));

        verify(authService).registerCustomer(any(RegisterRequest.class));
    }

    /**
     * Verifies that Bean Validation failures use the standard API error payload.
     */
    @Test
    void Should_returnValidationError_when_registerRequestIsInvalid() throws Exception {
        RegisterRequest invalidRequest = new RegisterRequest("", "", "not-an-email", "short", "phone#bad");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.details.fieldErrors").isArray());
    }

    /**
     * Verifies duplicate email domain errors are exposed with the documented code.
     */
    @Test
    void Should_returnEmailDuplicated_when_emailAlreadyExists() throws Exception {
        when(authService.registerCustomer(any(RegisterRequest.class))).thenThrow(new DomainException(
                "EMAIL_DUPLICATED",
                HttpStatus.CONFLICT,
                "An account with this email address already exists"
        ));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.code").value("EMAIL_DUPLICATED"))
                .andExpect(jsonPath("$.message").value("An account with this email address already exists"));
    }

    /**
     * Verifies that a valid login request returns 200 with tokens.
     */
    @Test
    void Should_returnOkAuthResponse_when_loginCredentialsAreValid() throws Exception {
        AuthResponse response = new AuthResponse(
                "access-token",
                "refresh-token",
                new UserDto(1L, "frodo@lembas.com", "Frodo", "Baggins", Role.CUSTOMER, null, null)
        );
        when(authService.authenticate(any(LoginRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validLogin())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("access-token"))
                .andExpect(jsonPath("$.refreshToken").value("refresh-token"))
                .andExpect(jsonPath("$.user.email").value("frodo@lembas.com"));

        verify(authService).authenticate(any(LoginRequest.class));
    }

    /**
     * Verifies that invalid credentials return 401 with the documented error code.
     */
    @Test
    void Should_returnUnauthorized_when_credentialsAreInvalid() throws Exception {
        when(authService.authenticate(any(LoginRequest.class))).thenThrow(new DomainException(
                "INVALID_CREDENTIALS",
                HttpStatus.UNAUTHORIZED,
                "Invalid email or password"
        ));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validLogin())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    /**
     * Verifies that disabled accounts return 403 with the documented error code.
     */
    @Test
    void Should_returnForbidden_when_accountIsDisabled() throws Exception {
        when(authService.authenticate(any(LoginRequest.class))).thenThrow(new DomainException(
                "ACCOUNT_DISABLED",
                HttpStatus.FORBIDDEN,
                "Your account has been disabled"
        ));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validLogin())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.code").value("ACCOUNT_DISABLED"));
    }

    /**
     * Verifies that a valid refresh request returns a rotated token pair.
     */
    @Test
    void Should_returnOkAuthResponse_when_refreshTokenIsValid() throws Exception {
        AuthResponse response = new AuthResponse(
                "new-access-token",
                "new-refresh-token",
                new UserDto(1L, "frodo@lembas.com", "Frodo", "Baggins", Role.CUSTOMER, null, null)
        );
        when(authService.refresh("old-refresh-token")).thenReturn(response);

        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RefreshTokenRequest("old-refresh-token"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("new-access-token"))
                .andExpect(jsonPath("$.refreshToken").value("new-refresh-token"))
                .andExpect(jsonPath("$.user.email").value("frodo@lembas.com"));

        verify(authService).refresh("old-refresh-token");
    }

    /**
     * Verifies invalid refresh tokens return 401 with the documented error code.
     */
    @Test
    void Should_returnUnauthorized_when_refreshTokenIsInvalid() throws Exception {
        when(authService.refresh("bad-refresh-token")).thenThrow(new DomainException(
                "INVALID_REFRESH_TOKEN",
                HttpStatus.UNAUTHORIZED,
                "Invalid or expired refresh token"
        ));

        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RefreshTokenRequest("bad-refresh-token"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
    }

    /**
     * Verifies GET /api/auth/me returns the authenticated user's profile.
     */
    @Test
    void Should_returnUserProfile_when_meEndpointIsCalled() throws Exception {
        User currentUser = new User(1L, null, "frodo@lembas.com", "hash", "Frodo", "Baggins",
                null, Role.CUSTOMER, true, null, null);
        AuthResponse response = new AuthResponse(
                null,
                null,
                new UserDto(1L, "frodo@lembas.com", "Frodo", "Baggins", Role.CUSTOMER, null, null)
        );

        when(securityContextHelper.getCurrentUser()).thenReturn(currentUser);
        when(authService.getCurrentUser(currentUser)).thenReturn(response);

        mockMvc.perform(get("/api/auth/me")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.user.email").value("frodo@lembas.com"))
                .andExpect(jsonPath("$.user.role").value("CUSTOMER"));
    }

    /**
     * Creates a valid customer registration request for controller tests.
     */
    private RegisterRequest validRequest() {
        return new RegisterRequest(
                "Frodo",
                "Baggins",
                "frodo@lembas.com",
                "Str0ng!Pass",
                "+54 351 123 4567"
        );
    }

    /**
     * Creates a valid login request for controller tests.
     */
    private LoginRequest validLogin() {
        return new LoginRequest("frodo@lembas.com", "Str0ng!Pass");
    }
}

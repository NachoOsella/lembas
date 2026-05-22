package com.dietetica.lembas.auth.service;

import com.dietetica.lembas.auth.dto.AuthResponse;
import com.dietetica.lembas.auth.dto.RegisterRequest;
import com.dietetica.lembas.auth.dto.UserDto;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for authentication DTO/entity mapping rules.
 */
class AuthMapperTest {

    private final AuthMapper mapper = new AuthMapper();

    /**
     * Verifies that customer registration normalizes fields and never assigns a branch.
     */
    @Test
    void toEntityCreatesCustomerWithNormalizedValues() {
        RegisterRequest request = new RegisterRequest(
                "  Frodo  ",
                "  Baggins  ",
                "  FRODO@LEMBAS.COM  ",
                "password123",
                "  +54 351 123 4567  "
        );

        User user = mapper.toEntity(request, "encoded-password");

        assertThat(user.getBranchId()).isNull();
        assertThat(user.getEmail()).isEqualTo("frodo@lembas.com");
        assertThat(user.getPasswordHash()).isEqualTo("encoded-password");
        assertThat(user.getFirstName()).isEqualTo("Frodo");
        assertThat(user.getLastName()).isEqualTo("Baggins");
        assertThat(user.getPhone()).isEqualTo("+54 351 123 4567");
        assertThat(user.getRole()).isEqualTo(Role.CUSTOMER);
        assertThat(user.isEnabled()).isTrue();
    }

    /**
     * Verifies that auth responses expose DTOs instead of JPA entities.
     */
    @Test
    void toAuthResponseMapsTokensAndUserDto() {
        User user = new User(7L, 1L, "admin@lembas.com", "hash", "Admin", "Lembas",
                null, Role.ADMIN, true, null, null);

        AuthResponse response = mapper.toAuthResponse("access-token", "refresh-token", user, "Centro");

        assertThat(response.token()).isEqualTo("access-token");
        assertThat(response.refreshToken()).isEqualTo("refresh-token");
        assertThat(response.user()).isEqualTo(new UserDto(
                7L,
                "admin@lembas.com",
                "Admin",
                "Lembas",
                Role.ADMIN,
                1L,
                "Centro"
        ));
    }
}

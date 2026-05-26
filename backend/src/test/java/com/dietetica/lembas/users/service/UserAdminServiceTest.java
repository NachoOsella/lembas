package com.dietetica.lembas.users.service;

import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.dto.CreateInternalUserRequest;
import com.dietetica.lembas.users.dto.UpdateUserRequest;
import com.dietetica.lembas.users.dto.UserMetricsResponse;
import com.dietetica.lembas.users.dto.UserResponse;
import com.dietetica.lembas.users.dto.UserStatusRequest;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import com.dietetica.lembas.users.repository.UserRepository;
import com.dietetica.lembas.users.repository.UserRepository.UserMetricsProjection;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link UserAdminService}.
 *
 * <p>Covers: create, update, list, enable/disable, duplicate email,
 * not-found cases, and business rule enforcement.</p>
 */
@ExtendWith(MockitoExtension.class)
class UserAdminServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private UserAdminService userAdminService;

    @BeforeEach
    void setUp() {
        userAdminService = new UserAdminService(userRepository, new UserBranchPolicy(), passwordEncoder);
    }

    @Nested
    class ListUsers {

        @Test
        void Should_returnAllUsers_when_noFilters() {
            Pageable pageable = PageRequest.of(0, 20);
            User user = anAdmin();
            when(userRepository.findInternalUsers(
                    List.of(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE),
                    null, null, null, pageable))
                    .thenReturn(new PageImpl<>(List.of(user)));

            Page<UserResponse> result = userAdminService.listUsers(null, null, null, pageable);

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().getFirst().email()).isEqualTo("admin@lembas.com");
        }

        @Test
        void Should_filterByRole_when_roleProvided() {
            Pageable pageable = PageRequest.of(0, 20);
            when(userRepository.findInternalUsers(
                    List.of(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE),
                    Role.MANAGER, null, null, pageable))
                    .thenReturn(new PageImpl<>(List.of(aManager())));

            Page<UserResponse> result = userAdminService.listUsers(Role.MANAGER, null, null, pageable);

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().getFirst().role()).isEqualTo(Role.MANAGER);
        }

        @Test
        void Should_filterByBranch_when_branchProvided() {
            Pageable pageable = PageRequest.of(0, 20);
            when(userRepository.findInternalUsers(
                    List.of(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE),
                    null, 1L, null, pageable))
                    .thenReturn(new PageImpl<>(List.of(aManager())));

            Page<UserResponse> result = userAdminService.listUsers(null, 1L, null, pageable);

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().getFirst().branchId()).isEqualTo(1L);
        }

        @Test
        void Should_filterByRoleAndBranch_when_bothFiltersProvided() {
            Pageable pageable = PageRequest.of(0, 20);
            when(userRepository.findInternalUsers(
                    List.of(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE),
                    Role.MANAGER, 1L, null, pageable))
                    .thenReturn(new PageImpl<>(List.of(aManager())));

            Page<UserResponse> result = userAdminService.listUsers(Role.MANAGER, 1L, null, pageable);

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().getFirst().role()).isEqualTo(Role.MANAGER);
            assertThat(result.getContent().getFirst().branchId()).isEqualTo(1L);
        }

        @Test
        void Should_rejectCustomerRoleFilter_when_listingUsers() {
            Pageable pageable = PageRequest.of(0, 20);

            assertThatThrownBy(() -> userAdminService.listUsers(Role.CUSTOMER, null, null, pageable))
                    .isInstanceOf(DomainException.class)
                    .hasFieldOrPropertyWithValue("code", "INVALID_ROLE_FILTER");
        }

        @Test
        void Should_searchInternalUsers_when_searchProvided() {
            Pageable pageable = PageRequest.of(0, 20);
            when(userRepository.findInternalUsers(
                    List.of(Role.ADMIN, Role.MANAGER, Role.EMPLOYEE),
                    null,
                    null,
                    "gandalf",
                    pageable
            )).thenReturn(new PageImpl<>(List.of(anAdmin())));

            Page<UserResponse> result = userAdminService.listUsers(null, null, "  Gandalf  ", pageable);

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().getFirst().email()).isEqualTo("admin@lembas.com");
        }
    }

    @Nested
    class GetUserMetrics {

        @Test
        void Should_aggregateInternalUserCountsFromRepository() {
            var projection = mockUserMetricsProjection(30, 25, 20);
            when(userRepository.computeUserMetrics()).thenReturn(projection);

            var metrics = userAdminService.getUserMetrics();

            assertThat(metrics.totalUsers()).isEqualTo(30);
            assertThat(metrics.enabledUsers()).isEqualTo(25);
            assertThat(metrics.usersWithBranch()).isEqualTo(20);
        }
    }

    @Nested
    class CreateUser {

        private static final String RAW_PASSWORD = "Str0ng!Pass";
        private static final String ENCODED_PASSWORD = "$2a$10$encoded";

        @Test
        void Should_createUser_when_validRequest() {
            var request = new CreateInternalUserRequest(
                    "newadmin@lembas.com",
                    RAW_PASSWORD,
                    "New",
                    "Admin",
                    null,
                    Role.ADMIN,
                    null
            );
            when(userRepository.existsByEmail("newadmin@lembas.com")).thenReturn(false);
            when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(ENCODED_PASSWORD);
            User savedUser = new User(
                    1L, null, "newadmin@lembas.com", ENCODED_PASSWORD,
                    "New", "Admin", null, Role.ADMIN, true,
                    Instant.now(), Instant.now()
            );
            when(userRepository.save(any(User.class))).thenReturn(savedUser);

            UserResponse response = userAdminService.createUser(request);

            assertThat(response.id()).isEqualTo(1L);
            assertThat(response.email()).isEqualTo("newadmin@lembas.com");
            assertThat(response.role()).isEqualTo(Role.ADMIN);
            assertThat(response.branchId()).isNull();
            assertThat(response.enabled()).isTrue();
        }

        @Test
        void Should_throwEmailDuplicated_when_emailExists() {
            var request = new CreateInternalUserRequest(
                    "existing@lembas.com",
                    RAW_PASSWORD,
                    "Existing",
                    "User",
                    null,
                    Role.EMPLOYEE,
                    1L
            );
            when(userRepository.existsByEmail("existing@lembas.com")).thenReturn(true);

            assertThatThrownBy(() -> userAdminService.createUser(request))
                    .isInstanceOf(DomainException.class)
                    .hasFieldOrPropertyWithValue("code", "EMAIL_DUPLICATED")
                    .hasFieldOrPropertyWithValue("status", HttpStatus.CONFLICT);

            verify(passwordEncoder, never()).encode(anyString());
            verify(userRepository, never()).save(any());
        }

        @Test
        void Should_throwInvalidUserBranch_when_managerWithoutBranch() {
            var request = new CreateInternalUserRequest(
                    "manager@lembas.com",
                    RAW_PASSWORD,
                    "Manager",
                    "User",
                    null,
                    Role.MANAGER,
                    null
            );
            when(userRepository.existsByEmail("manager@lembas.com")).thenReturn(false);
            when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(ENCODED_PASSWORD);

            assertThatThrownBy(() -> userAdminService.createUser(request))
                    .isInstanceOf(DomainException.class)
                    .hasFieldOrPropertyWithValue("code", "INVALID_USER_BRANCH")
                    .hasFieldOrPropertyWithValue("status", HttpStatus.BAD_REQUEST);
        }

        @Test
        void Should_throwInvalidUserBranch_when_employeeWithoutBranch() {
            var request = new CreateInternalUserRequest(
                    "employee@lembas.com",
                    RAW_PASSWORD,
                    "Employee",
                    "User",
                    null,
                    Role.EMPLOYEE,
                    null
            );
            when(userRepository.existsByEmail("employee@lembas.com")).thenReturn(false);
            when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(ENCODED_PASSWORD);

            assertThatThrownBy(() -> userAdminService.createUser(request))
                    .isInstanceOf(DomainException.class)
                    .hasFieldOrPropertyWithValue("code", "INVALID_USER_BRANCH")
                    .hasFieldOrPropertyWithValue("status", HttpStatus.BAD_REQUEST);
        }

        @Test
        void Should_normalizeEmail_when_creatingUser() {
            var request = new CreateInternalUserRequest(
                    "  UPPERCASE@LEMBAS.COM  ",
                    RAW_PASSWORD,
                    "Lower",
                    "Case",
                    null,
                    Role.ADMIN,
                    null
            );
            when(userRepository.existsByEmail("uppercase@lembas.com")).thenReturn(false);
            when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(ENCODED_PASSWORD);
            User savedUser = new User(
                    2L, null, "uppercase@lembas.com", ENCODED_PASSWORD,
                    "Lower", "Case", null, Role.ADMIN, true,
                    Instant.now(), Instant.now()
            );
            when(userRepository.save(any(User.class))).thenReturn(savedUser);

            userAdminService.createUser(request);

            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(captor.capture());
            assertThat(captor.getValue().getEmail()).isEqualTo("uppercase@lembas.com");
        }
    }

    @Nested
    class UpdateUser {

        private static final String RAW_PASSWORD = "NewPass123";
        private static final String ENCODED_PASSWORD = "$2a$10$new";

        @Test
        void Should_updateUserFields_when_validRequest() {
            User existingUser = existingAdmin();
            when(userRepository.findById(1L)).thenReturn(Optional.of(existingUser));
            when(userRepository.existsByEmail("updated@lembas.com")).thenReturn(false);
            when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(ENCODED_PASSWORD);
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

            var request = new UpdateUserRequest(
                    "updated@lembas.com",
                    RAW_PASSWORD,
                    "Updated",
                    "Name",
                    "+54 351 123 4567",
                    Role.MANAGER,
                    1L
            );

            UserResponse response = userAdminService.updateUser(1L, request);

            assertThat(response.email()).isEqualTo("updated@lembas.com");
            assertThat(response.firstName()).isEqualTo("Updated");
            assertThat(response.lastName()).isEqualTo("Name");
            assertThat(response.phone()).isEqualTo("+54 351 123 4567");
            assertThat(response.role()).isEqualTo(Role.MANAGER);
            assertThat(response.branchId()).isEqualTo(1L);

            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(captor.capture());
            assertThat(captor.getValue().getPasswordHash()).isEqualTo(ENCODED_PASSWORD);
        }

        @Test
        void Should_rejectDisablingLastEnabledAdmin() {
            User existingUser = existingAdmin();
            when(userRepository.findById(1L)).thenReturn(Optional.of(existingUser));
            when(userRepository.countByRoleAndEnabledTrue(Role.ADMIN)).thenReturn(1L);

            assertThatThrownBy(() -> userAdminService.updateUserStatus(1L, new UserStatusRequest(false)))
                    .isInstanceOf(DomainException.class)
                    .hasFieldOrPropertyWithValue("code", "LAST_ADMIN_DISABLE_FORBIDDEN");

            verify(userRepository, never()).save(any());
        }

        @Test
        void Should_throwUserNotFound_when_userDoesNotExist() {
            when(userRepository.findById(99L)).thenReturn(Optional.empty());

            var request = new UpdateUserRequest("email@test.com", null, null, null, null, null, null);

            assertThatThrownBy(() -> userAdminService.updateUser(99L, request))
                    .isInstanceOf(DomainException.class)
                    .hasFieldOrPropertyWithValue("code", "USER_NOT_FOUND")
                    .hasFieldOrPropertyWithValue("status", HttpStatus.NOT_FOUND);
        }

        @Test
        void Should_throwEmailDuplicated_when_newEmailTaken() {
            User existingUser = existingAdmin();
            when(userRepository.findById(1L)).thenReturn(Optional.of(existingUser));
            when(userRepository.existsByEmail("taken@lembas.com")).thenReturn(true);

            var request = new UpdateUserRequest("taken@lembas.com", null, null, null, null, null, null);

            assertThatThrownBy(() -> userAdminService.updateUser(1L, request))
                    .isInstanceOf(DomainException.class)
                    .hasFieldOrPropertyWithValue("code", "EMAIL_DUPLICATED");
        }

        @Test
        void Should_applyOnlyNonNullFields_when_partialUpdate() {
            User existingUser = existingAdmin();
            when(userRepository.findById(1L)).thenReturn(Optional.of(existingUser));
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

            var request = new UpdateUserRequest(null, null, "OnlyFirstName", null, null, null, null);

            UserResponse response = userAdminService.updateUser(1L, request);

            assertThat(response.firstName()).isEqualTo("OnlyFirstName");
            assertThat(response.lastName()).isEqualTo("User"); // unchanged
            assertThat(response.email()).isEqualTo("admin@lembas.com"); // unchanged
        }

        @Test
        void Should_clearBranch_when_roleChangesToAdmin() {
            User existingUser = aManager();
            when(userRepository.findById(2L)).thenReturn(Optional.of(existingUser));
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

            UserResponse response = userAdminService.updateUser(
                    2L,
                    new UpdateUserRequest(null, null, null, null, null, Role.ADMIN, null)
            );

            assertThat(response.role()).isEqualTo(Role.ADMIN);
            assertThat(response.branchId()).isNull();
        }

        @Test
        void Should_clearPhone_when_blankPhoneProvided() {
            User existingUser = existingAdmin();
            existingUser.setPhone("+54 351 123 4567");
            when(userRepository.findById(1L)).thenReturn(Optional.of(existingUser));
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

            UserResponse response = userAdminService.updateUser(
                    1L,
                    new UpdateUserRequest(null, null, null, null, "", null, null)
            );

            assertThat(response.phone()).isNull();
        }

        @Test
        void Should_hideCustomerUsers_when_updatingById() {
            User customer = new User(
                    9L, null, "customer@lembas.com", "hash",
                    "Customer", "User", null, Role.CUSTOMER, true,
                    Instant.now(), Instant.now()
            );
            when(userRepository.findById(9L)).thenReturn(Optional.of(customer));

            assertThatThrownBy(() -> userAdminService.updateUser(
                    9L,
                    new UpdateUserRequest(null, null, "Changed", null, null, null, null)
            ))
                    .isInstanceOf(DomainException.class)
                    .hasFieldOrPropertyWithValue("code", "USER_NOT_FOUND");
        }
    }

    @Nested
    class UpdateUserStatus {

        @Test
        void Should_disableUser_when_enabledIsFalse() {
            User existingUser = existingAdmin();
            when(userRepository.findById(1L)).thenReturn(Optional.of(existingUser));
            when(userRepository.countByRoleAndEnabledTrue(Role.ADMIN)).thenReturn(2L);
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

            UserResponse response = userAdminService.updateUserStatus(1L, new UserStatusRequest(false));

            assertThat(response.enabled()).isFalse();
        }

        @Test
        void Should_enableUser_when_enabledIsTrue() {
            User existingUser = existingAdmin();
            existingUser.setEnabled(false);
            when(userRepository.findById(1L)).thenReturn(Optional.of(existingUser));
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

            UserResponse response = userAdminService.updateUserStatus(1L, new UserStatusRequest(true));

            assertThat(response.enabled()).isTrue();
        }

        @Test
        void Should_throwUserNotFound_when_userDoesNotExist() {
            when(userRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> userAdminService.updateUserStatus(99L, new UserStatusRequest(false)))
                    .isInstanceOf(DomainException.class)
                    .hasFieldOrPropertyWithValue("code", "USER_NOT_FOUND")
                    .hasFieldOrPropertyWithValue("status", HttpStatus.NOT_FOUND);
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private static UserMetricsProjection mockUserMetricsProjection(long total, long enabled, long withBranch) {
        return new UserMetricsProjection() {
            @Override
            public long getTotalUsers() { return total; }
            @Override
            public long getEnabledUsers() { return enabled; }
            @Override
            public long getUsersWithBranch() { return withBranch; }
        };
    }

    private static User existingAdmin() {
        return new User(
                1L, null, "admin@lembas.com", "hash",
                "Admin", "User", null, Role.ADMIN, true,
                Instant.parse("2026-01-01T00:00:00Z"),
                Instant.parse("2026-01-01T00:00:00Z")
        );
    }

    private static User anAdmin() {
        return new User(
                1L, null, "admin@lembas.com", "hash",
                "Admin", "User", null, Role.ADMIN, true,
                Instant.now(), Instant.now()
        );
    }

    private static User aManager() {
        return new User(
                2L, 1L, "manager@lembas.com", "hash",
                "Manager", "User", null, Role.MANAGER, true,
                Instant.now(), Instant.now()
        );
    }
}

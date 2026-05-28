package com.dietetica.lembas.users.web;

import com.dietetica.lembas.users.dto.CreateInternalUserRequest;
import com.dietetica.lembas.users.dto.UpdateUserRequest;
import com.dietetica.lembas.users.dto.UserResponse;
import com.dietetica.lembas.users.dto.UserStatusRequest;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.service.UserAdminService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for admin user management (internal users only).
 *
 * <p>All endpoints are restricted to the ADMIN role via {@link PreAuthorize}.
 * Customers cannot be managed through these endpoints; they register via the
 * public {@code POST /api/auth/register} endpoint.</p>
 */
@RestController
@RequestMapping("/api/admin/users")
@SecurityRequirement(name = "bearerAuth")
public class UserAdminController {

    private final UserAdminService userAdminService;

    public UserAdminController(UserAdminService userAdminService) {
        this.userAdminService = userAdminService;
    }

    /**
     * Returns a paginated list of internal users, optionally filtered by role or branch.
     *
     * @param role     optional role filter (ADMIN, MANAGER, EMPLOYEE)
     * @param branchId optional branch filter
     * @param search   optional search term matched against name and email
     * @param pageable pagination and sorting parameters
     * @return a page of user responses
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Page<UserResponse> listUsers(
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return userAdminService.listUsers(role, branchId, search, pageable);
    }

    /**
     * Creates a new internal user.
     *
     * @param request the creation payload
     * @return the created user response
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse createUser(@Valid @RequestBody CreateInternalUserRequest request) {
        return userAdminService.createUser(request);
    }

    /**
     * Replaces an existing internal user representation.
     *
     * <p>This endpoint is kept for backward compatibility. For partial updates,
     * prefer {@code PATCH /api/admin/users/{id}}.</p>
     *
     * @param id      the user ID
     * @param request the update payload
     * @return the updated user response
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse updateUser(@PathVariable Long id,
                                   @Valid @RequestBody UpdateUserRequest request) {
        return userAdminService.updateUser(id, request);
    }

    /**
     * Partially updates an existing internal user. Only non-null fields are applied.
     *
     * @param id      the user ID
     * @param request the partial update payload
     * @return the updated user response
     */
    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse patchUser(@PathVariable Long id,
                                  @Valid @RequestBody UpdateUserRequest request) {
        return userAdminService.updateUser(id, request);
    }

    /**
     * Enables or disables a user account.
     *
     * @param id      the user ID
     * @param request the status payload containing the new enabled flag
     * @return the updated user response
     */
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse updateUserStatus(@PathVariable Long id,
                                         @Valid @RequestBody UserStatusRequest request) {
        return userAdminService.updateUserStatus(id, request);
    }
}

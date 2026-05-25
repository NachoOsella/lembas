package com.dietetica.lembas.auth.service;

import com.dietetica.lembas.users.model.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Provides access to the currently authenticated domain user from the
 * Spring Security context.
 */
@Component
public class SecurityContextHelper {

    /**
     * Returns the authenticated {@link User} entity from the security context.
     *
     * @return the current domain user
     * @throws IllegalStateException if no authenticated user is present
     */
    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalStateException("No authenticated user in security context");
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof LembasUserDetails details) {
            return details.getUser();
        }
        throw new IllegalStateException(
                "Unexpected principal type: " + principal.getClass().getName());
    }
}

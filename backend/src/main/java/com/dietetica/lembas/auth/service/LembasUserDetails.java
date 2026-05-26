package com.dietetica.lembas.auth.service;

import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/**
 * Adapts the Lembas {@link User} entity to the Spring Security {@link UserDetails}
 * contract so it can be used by the standard authentication provider and
 * JWT filter.
 *
 * <p>Roles are mapped as Spring Security authorities with the {@code ROLE_} prefix
 * (e.g., {@code ROLE_CUSTOMER}). This is the convention required by
 * {@code hasRole()} and {@code @PreAuthorize} expressions.</p>
 */
public class LembasUserDetails implements UserDetails {

    private final transient User user;

    public LembasUserDetails(User user) {
        this.user = user;
    }

    /**
     * Returns the underlying domain user entity.
     */
    public User getUser() {
        return user;
    }

    /**
     * Maps the user's domain role to a Spring Security granted authority.
     */
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
    }

    /**
     * Returns the BCrypt-encoded password hash.
     */
    @Override
    public String getPassword() {
        return user.getPasswordHash();
    }

    /**
     * Returns the email address used as the login username.
     */
    @Override
    public String getUsername() {
        return user.getEmail();
    }

    /**
     * Returns whether the account is enabled (active).
     */
    @Override
    public boolean isEnabled() {
        return user.isEnabled();
    }

    /**
     * Account expiry is not used in the MVP; accounts never expire.
     */
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    /**
     * Account locking is not used in the MVP; accounts are never locked.
     */
    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    /**
     * Credential expiry is not used in the MVP.
     */
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }
}

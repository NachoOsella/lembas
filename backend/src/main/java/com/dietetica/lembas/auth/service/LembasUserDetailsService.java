package com.dietetica.lembas.auth.service;

import com.dietetica.lembas.users.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Locale;

/**
 * Bridges the Lembas {@link User} entity to Spring Security's authentication
 * infrastructure.
 *
 * <p>Loaded by the {@code DaoAuthenticationProvider} during the login flow
 * and also used by the JWT filter to resolve the full user context from
 * a validated token's subject claim.</p>
 */
@Service
public class LembasUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public LembasUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Loads a user by email address for Spring Security authentication.
     *
     * @param email the email address of the user to load
     * @return a fully populated {@link LembasUserDetails} instance
     * @throws UsernameNotFoundException if no user exists with the given email
     */
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findByEmail(email.trim().toLowerCase(Locale.ROOT))
                .map(LembasUserDetails::new)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "User not found with email: " + email));
    }

    /**
     * Loads a user by their database primary key.
     *
     * <p>This method is used by the JWT authentication filter. Since JWT
     * tokens store the user ID as the subject claim, the filter resolves
     * the full {@link UserDetails} from that ID.</p>
     *
     * @param userId the user's database ID
     * @return a fully populated {@link LembasUserDetails} instance
     * @throws UsernameNotFoundException if no user exists with the given ID
     */
    public UserDetails loadUserById(Long userId) {
        return userRepository.findById(userId)
                .map(LembasUserDetails::new)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "User not found with id: " + userId));
    }
}

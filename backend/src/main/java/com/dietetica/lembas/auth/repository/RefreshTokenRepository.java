package com.dietetica.lembas.auth.repository;

import com.dietetica.lembas.auth.model.RefreshToken;
import com.dietetica.lembas.users.model.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

/**
 * Repository for persisted refresh tokens and rotation bookkeeping.
 */
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    /**
     * Finds a refresh token by hash and locks it for rotation.
     *
     * @param tokenHash deterministic SHA-256 hash of the raw token
     * @return the matching token record, if it exists
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    /**
     * Revokes all currently active tokens for a user.
     *
     * @param user      token owner
     * @param revokedAt revocation timestamp
     * @return number of rows updated
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update RefreshToken rt
            set rt.revokedAt = :revokedAt
            where rt.user = :user
              and rt.revokedAt is null
            """)
    int revokeActiveTokensByUser(@Param("user") User user, @Param("revokedAt") Instant revokedAt);

    /**
     * Deletes expired tokens and old revoked tokens for one user.
     *
     * @param user token owner
     * @param now current timestamp for expiration checks
     * @param revokedBefore upper bound for revoked-token retention
     * @return number of rows deleted
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            delete from RefreshToken rt
            where rt.user = :user
              and (
                  rt.expiresAt <= :now
                  or (rt.revokedAt is not null and rt.revokedAt <= :revokedBefore)
              )
            """)
    int deleteObsoleteTokensByUser(
            @Param("user") User user,
            @Param("now") Instant now,
            @Param("revokedBefore") Instant revokedBefore
    );
}

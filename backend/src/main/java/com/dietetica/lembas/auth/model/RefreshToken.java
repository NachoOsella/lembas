package com.dietetica.lembas.auth.model;

import com.dietetica.lembas.users.model.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Persisted refresh token metadata used to enforce refresh-token rotation.
 *
 * <p>The raw JWT is never stored. Only a SHA-256 hash is persisted so leaked
 * database contents cannot be used directly as bearer credentials.</p>
 */
@Entity
@Table(
        name = "refresh_tokens",
        indexes = {
                @Index(name = "idx_refresh_tokens_user_id", columnList = "user_id"),
                @Index(name = "idx_refresh_tokens_token_hash", columnList = "token_hash", unique = true)
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** User that owns this refresh token. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Deterministic SHA-256 hash of the raw refresh token. */
    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "rotated_at")
    private Instant rotatedAt;

    /** Creates an active refresh token record for the given user. */
    public RefreshToken(User user, String tokenHash, Instant expiresAt, Instant createdAt) {
        this.user = user;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
        this.createdAt = createdAt;
    }

    /** Marks this token as used in a successful rotation. */
    public void markRotated(Instant rotatedAt) {
        this.rotatedAt = rotatedAt;
        this.revokedAt = rotatedAt;
    }

    /** Marks this token as revoked without issuing a replacement. */
    public void revoke(Instant revokedAt) {
        this.revokedAt = revokedAt;
    }

    /** Returns whether the token can still be used at the given instant. */
    public boolean isActiveAt(Instant now) {
        return revokedAt == null && expiresAt.isAfter(now);
    }
}

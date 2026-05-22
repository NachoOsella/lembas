package com.dietetica.lembas.users.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * System user entity mapped to the {@code users} table.
 *
 * <p>Represents employees (ADMIN, MANAGER, EMPLOYEE) and online customers (CUSTOMER).
 * The {@code branch_id} column is a plain FK reference since no {@code Branch} entity
 * has been created yet.</p>
 *
 * <p>Business rules:</p>
 * <ul>
 *   <li>CUSTOMER: branch_id must be {@code null} (does not belong to an internal branch).</li>
 *   <li>MANAGER / EMPLOYEE: branch_id is required (assigned branch).</li>
 *   <li>ADMIN: branch_id is optional (global access).</li>
 * </ul>
 *
 * @see Role
 */
@Entity
@Table(
        name = "users",
        indexes = {
                @Index(name = "idx_users_email", columnList = "email", unique = true),
                @Index(name = "idx_users_branch_id", columnList = "branch_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    @ToString.Include
    private Long id;

    /** FK to the {@code branches} table. Nullable for CUSTOMER and ADMIN roles. */
    @Column(name = "branch_id")
    @Setter
    private Long branchId;

    @Column(nullable = false, unique = true, length = 255)
    @Setter
    private String email;

    /** BCrypt-encoded password hash. */
    @Column(name = "password_hash", nullable = false, length = 255)
    @Setter
    private String passwordHash;

    @Column(name = "first_name", nullable = false, length = 100)
    @Setter
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    @Setter
    private String lastName;

    @Column(length = 50)
    @Setter
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Setter
    private Role role;

    @Column(nullable = false)
    @Setter
    private boolean enabled = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /**
     * Constructs a new {@code User} with all required and optional fields, leaving
     * {@code createdAt} / {@code updatedAt} to be populated by Hibernate interceptors.
     */
    public User(Long branchId, String email, String passwordHash, String firstName, String lastName,
                String phone, Role role) {
        this.branchId = branchId;
        this.email = email;
        this.passwordHash = passwordHash;
        this.firstName = firstName;
        this.lastName = lastName;
        this.phone = phone;
        this.role = role;
    }
}

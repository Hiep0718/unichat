package com.unichat.core.user.domain;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

/**
 * Persistence layer gateway for User entities.
 */
public interface UserRepository extends JpaRepository<User, UUID> {
    /** Serializes all account and session mutations on the account row. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> lockById(@Param("id") UUID id);

    /** Serializes login and OTP changes for an existing account. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE LOWER(u.email) = LOWER(:email)")
    Optional<User> lockByEmail(@Param("email") String email);

    /** Counts accounts eligible to administer the system. */
    long countBySystemRoleAndStatus(SystemRole role, UserStatus status);
    /** Counts accounts by durable manual status, ignoring temporary login throttles. */
    long countByStatus(UserStatus status);
    /** Counts administrative accounts independently of their manual status. */
    long countBySystemRole(SystemRole role);

    /**
     * Finds a user by case-insensitive email.
     *
     * @param email user email
     * @return matching user
     */
    @Query("SELECT u FROM User u WHERE LOWER(u.email) = LOWER(:email)")
    Optional<User> findByEmailIgnoreCase(@Param("email") String email);

    /**
     * Checks if a user exists with a given case-insensitive email.
     *
     * @param email user email
     * @return true if exists
     */
    @Query("SELECT COUNT(u) > 0 FROM User u WHERE LOWER(u.email) = LOWER(:email)")
    boolean existsByEmailIgnoreCase(@Param("email") String email);

    /**
     * Searches users by email containing query string (case-insensitive).
     *
     * @param email search keyword
     * @param pageable pagination options
     * @return page of matching users
     */
    Page<User> findByEmailContainingIgnoreCase(String email, Pageable pageable);
}

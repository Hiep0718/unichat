package com.unichat.core.user.domain;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Persistence layer gateway for User entities.
 */
public interface UserRepository extends JpaRepository<User, UUID> {

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
     * Searches users by email matching query.
     *
     * @param query search query
     * @param pageable pagination options
     * @return page of matching users
     */
    @Query("SELECT u FROM User u WHERE :query IS NULL OR LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%'))")
    Page<User> searchUsers(@Param("query") String query, Pageable pageable);
}

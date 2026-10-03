package com.unichat.core.user.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;

/**
 * A member's name is theirs to choose. Until they do, it reads exactly as the
 * product read before names existed, so nothing appears blank.
 */
class UserDisplayNameTest {

    @Test
    void shouldStartFromTheEmailLocalPartSoNoNameIsEverEmpty() {
        // Arrange and Act
        User user = newUser("hung@example.com");

        // Assert
        assertEquals("hung", user.getDisplayName());
    }

    @Test
    void shouldTruncateAnOverlongLocalPartToFitTheColumn() {
        // Arrange: an address longer than the column allows.
        String longLocal = "a".repeat(80);

        // Act
        User user = newUser(longLocal + "@example.com");

        // Assert
        assertEquals(User.MAX_DISPLAY_NAME, user.getDisplayName().length());
    }

    @Test
    void shouldTakeTheNameTheMemberChose() {
        // Arrange
        User user = newUser("hung@example.com");

        // Act
        user.rename("Hoàng Phi Hùng");

        // Assert
        assertEquals("Hoàng Phi Hùng", user.getDisplayName());
    }

    @Test
    void shouldTrimSurroundingSpaceRatherThanStoringIt() {
        // Arrange
        User user = newUser("hung@example.com");

        // Act
        user.rename("  Hùng  ");

        // Assert
        assertEquals("Hùng", user.getDisplayName());
    }

    @Test
    void shouldRefuseABlankName() {
        // Arrange
        User user = newUser("hung@example.com");

        // Act and Assert: the database would reject it too; failing here gives
        // the member a message instead of a constraint violation.
        assertThrows(IllegalArgumentException.class, () -> user.rename("   "));
    }

    @Test
    void shouldRefuseANameLongerThanTheColumnHolds() {
        // Arrange
        User user = newUser("hung@example.com");

        // Act and Assert
        assertThrows(IllegalArgumentException.class,
                () -> user.rename("x".repeat(User.MAX_DISPLAY_NAME + 1)));
    }

    @Test
    void shouldKeepTheOldNameWhenAChangeIsRejected() {
        // Arrange
        User user = newUser("hung@example.com");
        user.rename("Hùng");

        // Act
        assertThrows(IllegalArgumentException.class, () -> user.rename(""));

        // Assert
        assertEquals("Hùng", user.getDisplayName());
    }

    private User newUser(String email) {
        return new User(UUID.randomUUID(), email, "hash",
                SystemRole.USER, UserStatus.ACTIVE, Instant.now());
    }
}

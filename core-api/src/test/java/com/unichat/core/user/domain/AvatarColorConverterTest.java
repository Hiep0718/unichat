package com.unichat.core.user.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.Test;

/**
 * The stored form of an avatar colour has to be the one the column admits.
 *
 * <p>Written after finding that {@code @Enumerated(EnumType.STRING)} wrote the
 * enum's name — {@code "NAVY"} — while {@code chk_users_avatar_color} in
 * migration V24 admits only the lowercase names. Every attempt to choose a
 * colour failed on the constraint, and no test covered the path, so the letter
 * avatars fell back to the colour derived from the name everywhere. These pin
 * the stored form so the mismatch cannot return unnoticed.
 */
class AvatarColorConverterTest {

    /** Exactly the values `chk_users_avatar_color` admits, as written there. */
    private static final List<String> ALLOWED_BY_THE_COLUMN =
            List.of("navy", "teal", "plum", "moss", "clay", "slate");

    private final AvatarColorConverter converter = new AvatarColorConverter();

    @Test
    void shouldStoreEveryColourInAFormTheColumnAdmits() {
        // Arrange, Act, Assert: the enum's own name would be rejected by the
        // check constraint, so each value is compared against that list.
        for (AvatarColor colour : AvatarColor.values()) {
            String stored = converter.convertToDatabaseColumn(colour);
            assertTrue(ALLOWED_BY_THE_COLUMN.contains(stored),
                    "cột chỉ nhận " + ALLOWED_BY_THE_COLUMN + " nhưng sẽ ghi " + stored);
        }
    }

    @Test
    void shouldCoverTheColumnsWholeVocabulary() {
        // Arrange, Act: the constraint and the enum must not drift apart —
        // a colour the UI offers but the column refuses fails at write time.
        List<String> stored = Arrays.stream(AvatarColor.values())
                .map(converter::convertToDatabaseColumn)
                .sorted()
                .toList();

        // Assert
        assertEquals(ALLOWED_BY_THE_COLUMN.stream().sorted().toList(), stored);
    }

    @Test
    void shouldReadBackEveryColourItWrites() {
        // Arrange, Act, Assert
        for (AvatarColor colour : AvatarColor.values()) {
            String stored = converter.convertToDatabaseColumn(colour);
            assertEquals(colour, converter.convertToEntityAttribute(stored));
        }
    }

    @Test
    void shouldKeepAnUnchosenColourAbsentRatherThanDefaulting() {
        // Arrange, Act, Assert: null means "derive it from the name", which is
        // a different statement from any particular colour.
        assertNull(converter.convertToDatabaseColumn(null));
        assertNull(converter.convertToEntityAttribute(null));
    }

    @Test
    void shouldStillReadAValueWrittenBeforeTheConverterExisted() {
        // Arrange, Act, Assert: reading accepts either case, so one stray
        // uppercase row loads instead of failing the whole query.
        assertEquals(AvatarColor.NAVY, converter.convertToEntityAttribute("NAVY"));
    }

    @Test
    void shouldLeaveAnUnknownStoredValueUnresolvedRatherThanGuessing() {
        // Arrange, Act, Assert: a colour this app no longer offers reads as
        // "none chosen", which falls back to the derived colour.
        assertNull(converter.convertToEntityAttribute("chartreuse"));
    }
}

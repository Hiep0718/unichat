package com.unichat.core.communitychat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

import com.unichat.core.common.error.ValidationError;

/**
 * A background applies only to a short post, and only in a colour the frontend
 * can actually draw.
 */
class PostBackgroundTest {

    @Test
    void shouldKeepAKnownColourOnAShortPost() {
        // Arrange and Act
        String key = PostBackground.validate("ocean", "Nhóm mình họp lúc 3 giờ chiều nhé");

        // Assert
        assertEquals("ocean", key);
    }

    @Test
    void shouldTreatNoChoiceAsAnOrdinaryPost() {
        // Arrange and Act and Assert
        assertNull(PostBackground.validate(null, "Nội dung"));
        assertNull(PostBackground.validate("", "Nội dung"));
        assertNull(PostBackground.validate("   ", "Nội dung"));
    }

    @Test
    void shouldRejectAColourTheFrontendCannotDraw() {
        // Arrange: an unknown key would render as no background at all, which
        // silently loses what the author picked rather than reporting it.
        assertThrows(ValidationError.class,
                () -> PostBackground.validate("neon-zebra", "Ngắn"));
    }

    @Test
    void shouldRefuseABackgroundOnABodyTooLongToReadOnOne() {
        // Arrange: one character past the limit, so the boundary is pinned.
        String tooLong = "a".repeat(PostBackground.MAX_BODY_LENGTH + 1);

        // Act and Assert
        assertThrows(ValidationError.class, () -> PostBackground.validate("dusk", tooLong));
    }

    @Test
    void shouldAllowABodyExactlyAtTheLimit() {
        // Arrange
        String atLimit = "a".repeat(PostBackground.MAX_BODY_LENGTH);

        // Act and Assert: the limit is inclusive, matching the picker, which
        // stays visible right up to it.
        assertEquals("dusk", PostBackground.validate("dusk", atLimit));
    }

    @Test
    void shouldNotMeasureLengthWhenNoColourWasChosen() {
        // Arrange: a long ordinary post is entirely normal and must not be
        // rejected by a rule that only exists for coloured ones.
        String longBody = "a".repeat(PostBackground.MAX_BODY_LENGTH * 3);

        // Act and Assert
        assertNull(PostBackground.validate(null, longBody));
    }
}

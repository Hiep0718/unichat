package com.unichat.core.communitychat.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.unichat.core.communitychat.api.ReactionSummary;

class ReactionTypeTest {

    @Test
    void shouldOfferTheSetPeopleAlreadyKnowFromFacebook() {
        // Order matters: it is the order every client draws the picker in, and
        // a reader who has used Facebook reaches for the position, not the name.
        assertEquals(
                List.of(ReactionType.LIKE, ReactionType.LOVE, ReactionType.CARE,
                        ReactionType.HAHA, ReactionType.WOW, ReactionType.SAD,
                        ReactionType.ANGRY),
                List.of(ReactionType.values()));
    }

    @Test
    void shouldPublishThatSameOrderToClients() {
        assertEquals(List.of(ReactionType.values()), ReactionSummary.displayOrder());
    }

    @Test
    void shouldStillAcceptTheTwoReactionsThatSurvivedTheChange() {
        assertEquals(ReactionType.LIKE, ReactionType.parse("like"));
        assertEquals(ReactionType.LOVE, ReactionType.parse("LOVE"));
    }

    @Test
    void shouldReadEveryNewReactionWhateverTheCasing() {
        assertEquals(ReactionType.CARE, ReactionType.parse("care"));
        assertEquals(ReactionType.HAHA, ReactionType.parse("Haha"));
        assertEquals(ReactionType.WOW, ReactionType.parse("WOW"));
        assertEquals(ReactionType.SAD, ReactionType.parse("sad"));
        assertEquals(ReactionType.ANGRY, ReactionType.parse("AnGrY"));
    }

    @Test
    void shouldRejectTheRetiredReactionsRatherThanStoreThem() {
        // V42 maps the stored rows; a client still sending the old name is out
        // of date and must be told, not silently given something else.
        assertThrows(IllegalArgumentException.class, () -> ReactionType.parse("INSIGHTFUL"));
        assertThrows(IllegalArgumentException.class, () -> ReactionType.parse("CELEBRATE"));
    }

    @Test
    void shouldRejectAnUnknownName() {
        assertThrows(IllegalArgumentException.class, () -> ReactionType.parse("DOWNVOTE"));
        assertThrows(IllegalArgumentException.class, () -> ReactionType.parse(""));
    }
}

package com.unichat.core.workspace.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;

class WorkspaceTopicTest {

    @Test
    void shouldGiveEveryTopicAReadableVietnameseLabel() {
        for (WorkspaceTopic topic : WorkspaceTopic.values()) {
            assertFalse(topic.getLabel().isBlank(),
                    topic.name() + " has no label, so a chip would render empty");
            assertFalse(topic.getIcon().isBlank(), topic.name() + " has no icon");
        }
    }

    @Test
    void shouldNotRepeatALabelBetweenTwoTopics() {
        Set<String> labels = new HashSet<>();
        for (WorkspaceTopic topic : WorkspaceTopic.values()) {
            // Two chips reading the same word make the filter useless, which
            // is the whole failure a fixed vocabulary exists to prevent.
            assertTrue(labels.add(topic.getLabel()), "Duplicate label: " + topic.getLabel());
        }
    }

    @Test
    void shouldReadATopicWhateverTheCasing() {
        assertEquals(WorkspaceTopic.DATA_SCIENCE, WorkspaceTopic.parse("DATA_SCIENCE"));
        assertEquals(WorkspaceTopic.DATA_SCIENCE, WorkspaceTopic.parse("data_science"));
        assertEquals(WorkspaceTopic.PROGRAMMING, WorkspaceTopic.parse("Programming"));
    }

    @Test
    void shouldRejectAnUnknownTopicRatherThanGuess() {
        assertThrows(IllegalArgumentException.class, () -> WorkspaceTopic.parse("COOKING"));
        assertThrows(IllegalArgumentException.class, () -> WorkspaceTopic.parse(""));
    }

    @Test
    void shouldCoverMoreThanComputerScience() {
        // The first vocabulary was half CS subfields, which left a group on
        // nutrition or history with nowhere to file itself but "Khác".
        var names = Arrays.stream(WorkspaceTopic.values()).map(Enum::name).toList();

        assertTrue(names.containsAll(List.of(
                "HEALTH", "PSYCHOLOGY", "ARTS_CULTURE", "HISTORY_SOCIETY",
                "PRODUCTIVITY", "LEADERSHIP", "ENTREPRENEURSHIP", "DESIGN")));
    }

    @Test
    void shouldLeadWithTechnicalSubjectsAndTrailWithTheCatchAlls() {
        var values = WorkspaceTopic.values();

        // Declaration order is display order on every client, so it is
        // behaviour rather than formatting.
        assertEquals(WorkspaceTopic.PROGRAMMING, values[0]);
        assertEquals(WorkspaceTopic.OTHER, values[values.length - 1]);
        assertEquals(WorkspaceTopic.RESEARCH, values[values.length - 2]);
    }

    @Test
    void shouldDeclareEachGroupContiguously() {
        // Declaration order is what the picker renders, so a topic stranded
        // outside its band would appear under the wrong heading.
        var seen = new java.util.LinkedHashSet<WorkspaceTopicGroup>();
        WorkspaceTopicGroup previous = null;
        for (WorkspaceTopic topic : WorkspaceTopic.values()) {
            if (topic.getGroup() != previous) {
                assertTrue(seen.add(topic.getGroup()),
                        "Group " + topic.getGroup() + " is split across the declaration");
                previous = topic.getGroup();
            }
        }
        assertEquals(WorkspaceTopicGroup.values().length, seen.size());
    }

    @Test
    void shouldGiveEveryGroupAHeading() {
        for (WorkspaceTopicGroup group : WorkspaceTopicGroup.values()) {
            assertFalse(group.getLabel().isBlank(), group.name() + " has no heading");
        }
    }

    @Test
    void shouldKeepEveryNameShortEnoughForTheColumnThatStoresIt() {
        // workspace_topics.topic is VARCHAR(40); a longer name would fail on
        // insert rather than at build time, so it is checked here.
        Arrays.stream(WorkspaceTopic.values()).forEach(topic ->
                assertTrue(topic.name().length() <= 40, topic.name() + " exceeds VARCHAR(40)"));
    }
}

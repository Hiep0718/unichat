package com.unichat.core.workspace.api;

import com.unichat.core.workspace.domain.WorkspaceTopic;

/**
 * One entry in the topic vocabulary, as the picker and filter chips draw it.
 *
 * <p>Served by the API rather than restated in the client. The visibility
 * labels were copied into six components and drifted into four contradictory
 * descriptions of the same thing; this list is longer and likelier to change,
 * so it gets one definition from the start.
 *
 * @param name       the stored value, sent back when filtering or saving
 * @param label      what a member reads
 * @param icon       Material symbol drawn beside the label
 * @param group      the band this sits under in a picker
 * @param groupLabel that band's heading, so the client needs no second lookup
 */
public record WorkspaceTopicResponse(
        String name, String label, String icon, String group, String groupLabel) {

    public static WorkspaceTopicResponse from(WorkspaceTopic topic) {
        return new WorkspaceTopicResponse(
                topic.name(),
                topic.getLabel(),
                topic.getIcon(),
                topic.getGroup().name(),
                topic.getGroup().getLabel());
    }
}

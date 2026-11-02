package com.unichat.core.workspace.api;

import com.unichat.core.workspace.domain.WorkspaceTopic;

/**
 * A topic that has something behind it, as the discovery filter draws it.
 *
 * <p>Separate from {@link WorkspaceTopicResponse}, which lists the whole
 * vocabulary for the picker: an owner must be able to file their group under
 * a subject nobody has used yet, while a reader browsing should not be offered
 * a chip that leads nowhere.
 *
 * @param count discoverable workspaces under this topic for the caller
 */
public record DiscoverableTopicResponse(String name, String label, String icon, long count) {

    public static DiscoverableTopicResponse of(WorkspaceTopic topic, long count) {
        return new DiscoverableTopicResponse(
                topic.name(), topic.getLabel(), topic.getIcon(), count);
    }
}

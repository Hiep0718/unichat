package com.unichat.core.chat.service;

import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.unichat.core.chat.api.AskQuestionRequest;
import com.unichat.core.chat.api.ChatTaskType;

/**
 * Resolves the task type of a chat turn from the user's natural-language intent.
 *
 * <p>An explicit {@code taskType} from a client is always honoured. When it is omitted, a
 * collection-wide summary request is routed to the asynchronous workspace summary pipeline if
 * that pipeline is enabled; otherwise the turn stays a grounded question and the adaptive
 * retrieval {@code SUMMARY} intent answers it. Routing never widens authorization: the summary
 * reservation still reauthorizes every document through {@link ChatAccessService}.</p>
 */
public final class ChatTaskRouter {
    private static final Logger LOG = LoggerFactory.getLogger(ChatTaskRouter.class);

    private ChatTaskRouter() { }

    /**
     * Builds the immutable binding for one turn, inferring the task type when the client omitted it.
     *
     * @param workspaceId target workspace
     * @param request validated ask payload
     * @param workspaceSummaryEnabled whether the workspace summary pipeline is enabled
     * @return binding whose task type and knowledge mode are deterministic for the same input
     */
    public static ChatBinding route(UUID workspaceId, AskQuestionRequest request, boolean workspaceSummaryEnabled) {
        ChatBinding binding = ChatBinding.from(workspaceId, request);
        if (request.taskType() != null || !workspaceSummaryEnabled) return binding;
        if (!WorkspaceSummaryIntentDetector.isWorkspaceSummary(binding.question())) return binding;
        LOG.info("chat_task_routed operation=reserve taskType={} rule={} expandedRequested={}",
                ChatTaskType.WORKSPACE_SUMMARY, WorkspaceSummaryIntentDetector.RULE_VERSION, binding.expanded());
        return new ChatBinding(workspaceId, binding.conversationId(), binding.question(), false,
                ChatTaskType.WORKSPACE_SUMMARY);
    }
}


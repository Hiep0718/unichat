package com.unichat.core.communitychat.service;

import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.communitychat.domain.AiMentionEvent;
import com.unichat.core.communitychat.domain.Discussion;
import com.unichat.core.communitychat.domain.DiscussionReply;
import com.unichat.core.communitychat.domain.DiscussionReplyRepository;
import com.unichat.core.communitychat.domain.DiscussionRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;

/**
 * Stores the assistant's answer under the comment that asked for it.
 *
 * <p>The answer can take a minute to arrive, and a lot can change in that
 * time. Before writing, this checks again that the post still exists in the
 * same group, that the asking comment is still there and that the asker is
 * still a member. If any of that changed, nothing is posted.
 */
@Service
public class AiReplyWriter {

    /** Account the assistant posts as; inserted by migration V19. */
    public static final UUID ASSISTANT_USER_ID =
            UUID.fromString("00000000-0000-0000-0000-0000000000a1");

    private static final Logger log = LoggerFactory.getLogger(AiReplyWriter.class);

    private final DiscussionRepository discussionRepository;
    private final DiscussionReplyRepository replyRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final Clock clock;

    /**
     * @param discussionRepository posts, to recheck and count the answer on
     * @param replyRepository      comments, to recheck the trigger and store the answer
     * @param memberRepository     memberships, to recheck the asker
     * @param clock                time source for the answer's timestamp
     */
    public AiReplyWriter(DiscussionRepository discussionRepository,
                         DiscussionReplyRepository replyRepository,
                         WorkspaceMemberRepository memberRepository,
                         Clock clock) {
        this.discussionRepository = discussionRepository;
        this.replyRepository = replyRepository;
        this.memberRepository = memberRepository;
        this.clock = clock;
    }

    /**
     * Posts the answer when the thread may still receive it.
     *
     * @param event  the mention being answered
     * @param answer what the assistant says
     * @return true when the answer was stored, false when access changed meanwhile
     */
    @Transactional
    public boolean post(AiMentionEvent event, AiMentionAnswer answer) {
        Optional<Discussion> discussion = stillAnswerable(event);
        if (discussion.isEmpty()) {
            log.info("Skipped assistant answer for discussion {}: thread or access changed (trace {})",
                    event.discussionId(), answer.traceId());
            return false;
        }
        Instant now = Instant.now(clock);
        DiscussionReply reply = new DiscussionReply(UUID.randomUUID(), event.discussionId(),
                ASSISTANT_USER_ID, answer.body(), event.triggerReplyId(), true, now);
        reply.setCitations(answer.citations());
        reply.setRetrievalTraceId(answer.traceId());
        replyRepository.save(reply);

        Discussion thread = discussion.get();
        thread.incrementReplyCount();
        thread.setUpdatedAt(now);
        discussionRepository.save(thread);
        log.info("Assistant answered discussion {} with {} citations (trace {})",
                event.discussionId(), answer.citations().size(), answer.traceId());
        return true;
    }

    private Optional<Discussion> stillAnswerable(AiMentionEvent event) {
        boolean askerIsMember = memberRepository.findByWorkspaceIdAndUserIdAndStatus(
                event.workspaceId(), event.asker().userId(), WorkspaceMemberStatus.ACTIVE).isPresent();
        if (!askerIsMember || !replyRepository.existsById(event.triggerReplyId())) {
            return Optional.empty();
        }
        return discussionRepository.findById(event.discussionId())
                .filter(found -> found.getWorkspaceId().equals(event.workspaceId()))
                .filter(found -> !"DELETED".equals(found.getStatus()));
    }
}

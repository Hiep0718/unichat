package com.unichat.core.workchat.service;

import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.ConflictError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.shared.util.UuidGenerator;
import com.unichat.core.workchat.api.ConversationSummary;
import com.unichat.core.workchat.api.ParticipantSummary;
import com.unichat.core.workchat.domain.ConversationListChangedEvent;
import com.unichat.core.workchat.domain.ConversationParticipant;
import com.unichat.core.workchat.domain.ConversationParticipantRepository;
import com.unichat.core.workchat.domain.DirectConversation;
import com.unichat.core.workchat.domain.DirectConversationRepository;
import com.unichat.core.workchat.domain.ParticipantRole;

/**
 * Group conversations: who is in one, and who may change that.
 *
 * <p>Membership is still governed by sharing a group, through
 * {@link ContactDirectory}: every person added must be someone the adder could
 * already message one-to-one. Without that, a group would be a way around the
 * rule that strangers cannot reach you — add them to a group and start typing.
 *
 * <p>Only an owner renames a group or changes its membership. Anyone may leave,
 * and an owner who leaves hands the group to whoever joined earliest, so a group
 * cannot be left with nobody able to administer it.
 */
@Service
@Transactional(readOnly = true)
public class GroupConversationService {

    /** Chosen to keep a group a group; beyond this the feed is the right place. */
    static final int MAX_PARTICIPANTS = 50;

    private final DirectConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final ConversationAccess conversationAccess;
    private final ConversationSummaryAssembler assembler;
    private final ContactDirectory contactDirectory;
    private final ApplicationEventPublisher eventPublisher;
    private final Clock clock;

    public GroupConversationService(DirectConversationRepository conversationRepository,
                                    ConversationParticipantRepository participantRepository,
                                    ConversationAccess conversationAccess,
                                    ConversationSummaryAssembler assembler,
                                    ContactDirectory contactDirectory,
                                    ApplicationEventPublisher eventPublisher,
                                    Clock clock) {
        this.conversationRepository = conversationRepository;
        this.participantRepository = participantRepository;
        this.conversationAccess = conversationAccess;
        this.assembler = assembler;
        this.contactDirectory = contactDirectory;
        this.eventPublisher = eventPublisher;
        this.clock = clock;
    }

    /**
     * Creates a group with the caller as its owner.
     *
     * @param memberIds everyone else to start with; duplicates and the caller
     *                  are ignored rather than rejected, since both are a
     *                  client sending the obvious thing
     * @throws ValidationError    if nobody else is left, or there are too many
     * @throws AuthorizationError if any of them shares no group with the caller
     */
    @Transactional
    public ConversationSummary create(UUID callerId, String title, List<UUID> memberIds) {
        Set<UUID> members = othersAmong(memberIds, callerId);
        if (members.isEmpty()) {
            throw new ValidationError("Nhóm cần ít nhất một thành viên khác");
        }
        requireRoom(members.size() + 1);
        members.forEach(member -> requireContact(callerId, member));

        Instant now = Instant.now(clock);
        DirectConversation group = conversationRepository.save(
                DirectConversation.group(UuidGenerator.generateV7(), title, callerId, now));

        participantRepository.save(new ConversationParticipant(
                group.getId(), callerId, ParticipantRole.OWNER, now));
        members.forEach(member -> participantRepository.save(new ConversationParticipant(
                group.getId(), member, ParticipantRole.MEMBER, now)));

        announce(members, group.getId());
        return assembler.assembleOne(group, callerId);
    }

    /** Renames a group. Only its owner may. */
    @Transactional
    public ConversationSummary rename(UUID callerId, UUID conversationId, String title) {
        DirectConversation group = requireOwnedGroup(callerId, conversationId);
        group.rename(title);
        conversationRepository.save(group);

        announce(conversationAccess.recipientsOf(conversationId, callerId), conversationId);
        return assembler.assembleOne(group, callerId);
    }

    /**
     * Adds someone to a group.
     *
     * <p>They see the messages sent before they joined. A group's point is a
     * shared thread, and a member reading half of one would be answering
     * questions they cannot see (ADR-023).
     *
     * @throws ConflictError      if they are already in it
     * @throws AuthorizationError if the caller is not the owner, or shares no
     *                            group with them
     */
    @Transactional
    public List<ParticipantSummary> addMember(UUID callerId, UUID conversationId, UUID userId) {
        requireOwnedGroup(callerId, conversationId);
        requireContact(callerId, userId);
        if (participantRepository.findByIdConversationIdAndIdUserId(conversationId, userId)
                .isPresent()) {
            throw new ConflictError("Người này đã ở trong nhóm");
        }
        requireRoom(participantRepository.countByIdConversationId(conversationId) + 1);

        participantRepository.save(new ConversationParticipant(
                conversationId, userId, ParticipantRole.MEMBER, Instant.now(clock)));

        announce(conversationAccess.recipientsOf(conversationId, callerId), conversationId);
        return listParticipants(callerId, conversationId);
    }

    /**
     * Removes someone from a group. Only its owner may.
     *
     * @throws ValidationError if the owner names themselves; leaving is its own
     *                         operation because it hands the group on
     */
    @Transactional
    public List<ParticipantSummary> removeMember(UUID callerId, UUID conversationId, UUID userId) {
        requireOwnedGroup(callerId, conversationId);
        if (callerId.equals(userId)) {
            throw new ValidationError("Chủ nhóm rời nhóm bằng chức năng rời nhóm");
        }
        ConversationParticipant participant = participantRepository
                .findByIdConversationIdAndIdUserId(conversationId, userId)
                .orElseThrow(() -> new ValidationError("Người này không ở trong nhóm"));

        participantRepository.delete(participant);

        Set<UUID> told = new LinkedHashSet<>(
                conversationAccess.recipientsOf(conversationId, callerId));
        // Told as well, so the group disappears from their list at once.
        told.add(userId);
        announce(told, conversationId);
        return listParticipants(callerId, conversationId);
    }

    /**
     * Leaves a group.
     *
     * <p>An owner who leaves hands the group to whoever joined earliest, so it
     * is never left with nobody able to administer it. The last person out
     * leaves the messages behind: they are still referenced, and the
     * conversation simply stops appearing in anyone's list.
     */
    @Transactional
    public void leave(UUID callerId, UUID conversationId) {
        ConversationAccess.Participation participation =
                conversationAccess.participationOf(callerId, conversationId);
        if (!participation.conversation().isGroup()) {
            throw new ValidationError("Không thể rời cuộc trò chuyện riêng");
        }

        participantRepository.delete(participation.participant());

        List<ConversationParticipant> remaining = conversationAccess
                .participantsOf(conversationId).stream()
                .filter(participant -> !participant.getUserId().equals(callerId))
                .toList();
        if (participation.participant().isOwner()) {
            handOver(remaining);
        }

        announce(
                remaining.stream().map(ConversationParticipant::getUserId)
                        .collect(Collectors.toSet()),
                conversationId);
    }

    /** Everyone in a conversation, for the members panel. */
    public List<ParticipantSummary> listParticipants(UUID callerId, UUID conversationId) {
        conversationAccess.requireParticipant(callerId, conversationId);
        return assembler.participantSummaries(
                conversationAccess.participantsOf(conversationId), callerId);
    }

    /* ---------- Private helpers ---------- */

    /** Gives the group to whoever joined earliest, if anyone is left. */
    private void handOver(List<ConversationParticipant> remaining) {
        remaining.stream()
                .min(Comparator.comparing(ConversationParticipant::getJoinedAt))
                .ifPresent(heir -> {
                    heir.promoteToOwner();
                    participantRepository.save(heir);
                });
    }

    private DirectConversation requireOwnedGroup(UUID callerId, UUID conversationId) {
        ConversationAccess.Participation participation =
                conversationAccess.participationOf(callerId, conversationId);
        if (!participation.conversation().isGroup()) {
            throw new ValidationError("Cuộc trò chuyện này không phải nhóm");
        }
        if (!participation.participant().isOwner()) {
            throw new AuthorizationError("Chỉ chủ nhóm mới thay đổi được nhóm");
        }
        return participation.conversation();
    }

    private void requireContact(UUID callerId, UUID userId) {
        if (!contactDirectory.canMessage(callerId, userId)) {
            throw new AuthorizationError("Chỉ thêm được thành viên cùng nhóm với bạn");
        }
    }

    private static void requireRoom(long total) {
        if (total > MAX_PARTICIPANTS) {
            throw new ValidationError("Nhóm tối đa " + MAX_PARTICIPANTS + " người");
        }
    }

    /** Distinct ids with the caller removed, keeping the order they were sent. */
    private static Set<UUID> othersAmong(List<UUID> memberIds, UUID callerId) {
        Set<UUID> members = new LinkedHashSet<>(memberIds);
        members.remove(callerId);
        return members;
    }

    private void announce(Set<UUID> recipientIds, UUID conversationId) {
        if (!recipientIds.isEmpty()) {
            eventPublisher.publishEvent(
                    new ConversationListChangedEvent(recipientIds, conversationId));
        }
    }
}

package com.unichat.core.chat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import com.unichat.core.chat.domain.Conversation;
import com.unichat.core.chat.domain.ConversationRepository;
import com.unichat.core.chat.domain.Message;
import com.unichat.core.chat.domain.MessageRepository;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;
import com.unichat.core.workspace.domain.WorkspaceRole;
import com.unichat.core.workspace.domain.WorkspaceVisibility;

class ConversationServiceTest {

    private ConversationRepository conversationRepository;
    private MessageRepository messageRepository;
    private com.unichat.core.chat.domain.CitationHistoryRepository citationHistoryRepository;
    private com.unichat.core.document.domain.DocumentRepository documentRepository;
    private WorkspaceRepository workspaceRepository;
    private WorkspaceMemberRepository workspaceMemberRepository;
    private ConversationService conversationService;

    @BeforeEach
    void setUp() {
        conversationRepository = mock(ConversationRepository.class);
        messageRepository = mock(MessageRepository.class);
        citationHistoryRepository = mock(com.unichat.core.chat.domain.CitationHistoryRepository.class);
        documentRepository = mock(com.unichat.core.document.domain.DocumentRepository.class);
        workspaceRepository = mock(WorkspaceRepository.class);
        workspaceMemberRepository = mock(WorkspaceMemberRepository.class);
        conversationService = new ConversationService(
                conversationRepository,
                messageRepository,
                citationHistoryRepository,
                documentRepository,
                workspaceRepository,
                workspaceMemberRepository,
                Clock.systemUTC()
        );
    }



    @Test
    void shouldCreateConversationSuccessfully() {
        var userId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var workspace = new Workspace(workspaceId, userId, "Test Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now());
        var member = new WorkspaceMember(workspaceId, userId, WorkspaceRole.EDITOR, WorkspaceMemberStatus.ACTIVE, userId);

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(member));

        var response = conversationService.createConversation(userId, workspaceId);

        assertNotNull(response);
        assertEquals("Hội thoại mới", response.title());
        verify(conversationRepository).save(any(Conversation.class));
    }

    @Test
    void shouldGetConversationsList() {
        var userId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var workspace = new Workspace(workspaceId, userId, "Test Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now());
        var member = new WorkspaceMember(workspaceId, userId, WorkspaceRole.EDITOR, WorkspaceMemberStatus.ACTIVE, userId);
        var conv = new Conversation(UUID.randomUUID(), workspaceId, userId, "Sample Conversation", Instant.now());
        var pageable = PageRequest.of(0, 20);

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(member));
        when(conversationRepository.findByUserIdAndWorkspaceIdAndStatusOrderByUpdatedAtDesc(userId, workspaceId, "ACTIVE", pageable))
                .thenReturn(new PageImpl<>(List.of(conv)));

        var page = conversationService.getConversations(userId, workspaceId, pageable);

        assertNotNull(page);
        assertEquals(1, page.getTotalElements());
        assertEquals("Sample Conversation", page.getContent().get(0).title());
    }

    @Test
    void shouldGetConversationDetailWithMessages() {
        var userId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var convId = UUID.randomUUID();
        var workspace = new Workspace(workspaceId, userId, "Test Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now());
        var member = new WorkspaceMember(workspaceId, userId, WorkspaceRole.EDITOR, WorkspaceMemberStatus.ACTIVE, userId);
        var conv = new Conversation(convId, workspaceId, userId, "Sample Conversation", Instant.now());
        var msg = new Message(UUID.randomUUID(), convId, "USER", "Hello", null, null, null, Instant.now());

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(member));
        when(conversationRepository.findByUserIdAndIdAndStatus(userId, convId, "ACTIVE")).thenReturn(Optional.of(conv));
        when(messageRepository.findByConversationIdOrderByCreatedAtAsc(convId)).thenReturn(List.of(msg));
        when(documentRepository.findByWorkspaceIdExcludingDeleting(any(), any())).thenReturn(new org.springframework.data.domain.PageImpl<>(List.of()));

        var detail = conversationService.getConversation(userId, workspaceId, convId);

        assertNotNull(detail);
        assertEquals(1, detail.messages().size());
        assertEquals("Hello", detail.messages().get(0).content());
    }

    @Test
    void shouldThrowNotFoundWhenDeleteNonExistentConversation() {
        var userId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var convId = UUID.randomUUID();
        var workspace = new Workspace(workspaceId, userId, "Test Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now());
        var member = new WorkspaceMember(workspaceId, userId, WorkspaceRole.EDITOR, WorkspaceMemberStatus.ACTIVE, userId);

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(member));
        when(conversationRepository.findByUserIdAndIdAndStatus(userId, convId, "ACTIVE")).thenReturn(Optional.empty());

        assertThrows(NotFoundError.class, () -> conversationService.deleteConversation(userId, workspaceId, convId));
    }
}

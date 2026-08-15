package com.unichat.core.chat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
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

import com.unichat.core.chat.api.AskQuestionRequest;
import com.unichat.core.chat.domain.Conversation;
import com.unichat.core.chat.domain.ConversationRepository;
import com.unichat.core.chat.domain.Message;
import com.unichat.core.chat.domain.MessageRepository;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.document.domain.DocumentRepository;
import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;
import com.unichat.core.workspace.domain.WorkspaceRole;
import com.unichat.core.workspace.domain.WorkspaceVisibility;

class ChatServiceTest {

    private WorkspaceRepository workspaceRepository;
    private WorkspaceMemberRepository workspaceMemberRepository;
    private DocumentRepository documentRepository;
    private ConversationRepository conversationRepository;
    private MessageRepository messageRepository;
    private com.unichat.core.chat.domain.CitationHistoryRepository citationHistoryRepository;
    private com.unichat.core.shared.config.ServiceTokenIssuer serviceTokenIssuer;
    private ChatService chatService;

    @BeforeEach
    void setUp() {
        workspaceRepository = mock(WorkspaceRepository.class);
        workspaceMemberRepository = mock(WorkspaceMemberRepository.class);
        documentRepository = mock(DocumentRepository.class);
        conversationRepository = mock(ConversationRepository.class);
        messageRepository = mock(MessageRepository.class);
        citationHistoryRepository = mock(com.unichat.core.chat.domain.CitationHistoryRepository.class);
        serviceTokenIssuer = mock(com.unichat.core.shared.config.ServiceTokenIssuer.class);
        org.mockito.Mockito.when(serviceTokenIssuer.issueToken()).thenReturn("Bearer test-token");
        chatService = new ChatService(
                workspaceRepository,
                workspaceMemberRepository,
                documentRepository,
                conversationRepository,
                messageRepository,
                citationHistoryRepository,
                serviceTokenIssuer,
                Clock.systemUTC()
        );
    }


    @Test
    void shouldAskQuestionSuccessfully() {
        var userId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var workspace = new Workspace(workspaceId, userId, "Class Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now());
        var member = new WorkspaceMember(workspaceId, userId, WorkspaceRole.EDITOR, WorkspaceMemberStatus.ACTIVE, userId);

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(member));
        when(documentRepository.findAllowedDocumentIdsForWorkspaces(List.of(workspaceId))).thenReturn(List.of(UUID.randomUUID()));
        when(documentRepository.findByWorkspaceIdExcludingDeleting(any(), any())).thenReturn(new org.springframework.data.domain.PageImpl<>(List.of()));

        var request = new AskQuestionRequest("Khái niệm Vector Embedding là gì?", null);

        var response = chatService.askQuestion(userId, workspaceId, request, "req-999");

        assertNotNull(response);
        assertNotNull(response.messageId());
        assertNotNull(response.conversationId());
        verify(conversationRepository, atLeastOnce()).save(any(Conversation.class));
        verify(messageRepository, atLeastOnce()).save(any(Message.class));
    }

    @Test
    void shouldThrowNotFoundErrorWhenUserNotMember() {
        var userId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var workspace = new Workspace(workspaceId, UUID.randomUUID(), "Class Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now());

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.empty());

        var request = new AskQuestionRequest("Hỏi đáp RAG", null);

        assertThrows(NotFoundError.class, () -> chatService.askQuestion(userId, workspaceId, request, "req-999"));
    }
}

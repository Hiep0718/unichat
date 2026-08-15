package com.unichat.core.document.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.ConflictError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.document.domain.Document;
import com.unichat.core.document.domain.DocumentRepository;
import com.unichat.core.document.domain.DocumentStatus;
import com.unichat.core.document.messaging.DocumentIngestionMessage;
import com.unichat.core.document.messaging.DocumentIngestionProducer;
import com.unichat.core.document.storage.StoragePort;
import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;
import com.unichat.core.workspace.domain.WorkspaceRole;
import com.unichat.core.workspace.domain.WorkspaceVisibility;

class DocumentServiceTest {

    private DocumentRepository documentRepository;
    private WorkspaceRepository workspaceRepository;
    private WorkspaceMemberRepository workspaceMemberRepository;
    private StoragePort storagePort;
    private DocumentIngestionProducer ingestionProducer;
    private com.unichat.core.chat.domain.CitationHistoryRepository citationHistoryRepository;
    private DocumentService documentService;

    @BeforeEach
    void setUp() {
        documentRepository = mock(DocumentRepository.class);
        workspaceRepository = mock(WorkspaceRepository.class);
        workspaceMemberRepository = mock(WorkspaceMemberRepository.class);
        citationHistoryRepository = mock(com.unichat.core.chat.domain.CitationHistoryRepository.class);
        storagePort = mock(StoragePort.class);
        ingestionProducer = mock(DocumentIngestionProducer.class);
        documentService = new DocumentService(
                documentRepository,
                workspaceRepository,
                workspaceMemberRepository,
                citationHistoryRepository,
                storagePort,
                ingestionProducer,
                java.time.Clock.systemUTC()
        );
    }

    @Test
    void shouldUploadDocumentSuccessfullyWhenEditor() {
        var userId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var workspace = new Workspace(workspaceId, userId, "Test Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now());
        var member = new WorkspaceMember(workspaceId, userId, WorkspaceRole.EDITOR, WorkspaceMemberStatus.ACTIVE, userId);
        var file = new MockMultipartFile("file", "test.pdf", "application/pdf", "PDF content".getBytes());

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(member));
        when(documentRepository.countByWorkspaceId(workspaceId)).thenReturn(0L);
        when(documentRepository.sumByteSizeByWorkspaceId(workspaceId)).thenReturn(0L);

        var response = documentService.uploadDocument(userId, workspaceId, file, "req-123");

        assertNotNull(response);
        assertEquals(DocumentStatus.PENDING, response.status());
        verify(documentRepository).save(any(Document.class));
        verify(ingestionProducer).sendIngestionMessage(any(DocumentIngestionMessage.class));
    }


    @Test
    void shouldThrowAuthorizationErrorWhenViewerUploads() {
        var userId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var workspace = new Workspace(workspaceId, UUID.randomUUID(), "Test Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now());
        var member = new WorkspaceMember(workspaceId, userId, WorkspaceRole.VIEWER, WorkspaceMemberStatus.ACTIVE, userId);
        var file = new MockMultipartFile("file", "test.pdf", "application/pdf", "PDF content".getBytes());

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(member));

        assertThrows(AuthorizationError.class, () -> documentService.uploadDocument(userId, workspaceId, file, "req-123"));
    }

    @Test
    void shouldThrowValidationErrorWhenUnsupportedMediaType() {
        var userId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var workspace = new Workspace(workspaceId, userId, "Test Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now());
        var member = new WorkspaceMember(workspaceId, userId, WorkspaceRole.EDITOR, WorkspaceMemberStatus.ACTIVE, userId);
        var file = new MockMultipartFile("file", "test.exe", "application/x-msdownload", "exe content".getBytes());

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(member));

        assertThrows(ValidationError.class, () -> documentService.uploadDocument(userId, workspaceId, file, "req-123"));
    }

    @Test
    void shouldThrowValidationErrorWhenFileSizeExceedsLimit() {
        var userId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var workspace = new Workspace(workspaceId, userId, "Test Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now());
        var member = new WorkspaceMember(workspaceId, userId, WorkspaceRole.EDITOR, WorkspaceMemberStatus.ACTIVE, userId);

        byte[] oversizedBytes = new byte[25 * 1024 * 1024];
        var file = new MockMultipartFile("file", "oversized.pdf", "application/pdf", oversizedBytes);

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(member));

        assertThrows(ValidationError.class, () -> documentService.uploadDocument(userId, workspaceId, file, "req-123"));
    }

    @Test
    void shouldThrowValidationErrorWhenEmptyFileUploaded() {
        var userId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var workspace = new Workspace(workspaceId, userId, "Test Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now());
        var member = new WorkspaceMember(workspaceId, userId, WorkspaceRole.EDITOR, WorkspaceMemberStatus.ACTIVE, userId);
        var file = new MockMultipartFile("file", "empty.pdf", "application/pdf", new byte[0]);

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(member));

        assertThrows(ValidationError.class, () -> documentService.uploadDocument(userId, workspaceId, file, "req-123"));
    }

    @Test
    void shouldThrowConflictErrorWhenWorkspaceDocumentQuotaExceeded() {
        var userId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var workspace = new Workspace(workspaceId, userId, "Test Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now());
        var member = new WorkspaceMember(workspaceId, userId, WorkspaceRole.EDITOR, WorkspaceMemberStatus.ACTIVE, userId);
        var file = new MockMultipartFile("file", "test.pdf", "application/pdf", "PDF content".getBytes());

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(member));
        when(documentRepository.countByWorkspaceId(workspaceId)).thenReturn(100L);

        assertThrows(ConflictError.class, () -> documentService.uploadDocument(userId, workspaceId, file, "req-123"));
    }
}

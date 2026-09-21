package com.unichat.core.document.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.springframework.web.multipart.MultipartFile;

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
    private com.unichat.core.user.domain.UserRepository userRepository;
    private DocumentService documentService;

    @BeforeEach
    void setUp() {
        documentRepository = mock(DocumentRepository.class);
        workspaceRepository = mock(WorkspaceRepository.class);
        workspaceMemberRepository = mock(WorkspaceMemberRepository.class);
        citationHistoryRepository = mock(com.unichat.core.chat.domain.CitationHistoryRepository.class);
        storagePort = mock(StoragePort.class);
        ingestionProducer = mock(DocumentIngestionProducer.class);
        userRepository = mock(com.unichat.core.user.domain.UserRepository.class);
        documentService = new DocumentService(
                documentRepository,
                workspaceRepository,
                workspaceMemberRepository,
                citationHistoryRepository,
                storagePort,
                ingestionProducer,
                userRepository,
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
    void shouldHoldViewerUploadForApprovalWithoutSendingToIngestion() {
        var userId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var workspace = new Workspace(workspaceId, UUID.randomUUID(), "Test Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now());
        var member = new WorkspaceMember(workspaceId, userId, WorkspaceRole.VIEWER, WorkspaceMemberStatus.ACTIVE, userId);
        var file = new MockMultipartFile("file", "test.pdf", "application/pdf", "PDF content".getBytes());

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(member));
        when(documentRepository.countByWorkspaceId(workspaceId)).thenReturn(0L);
        when(documentRepository.sumByteSizeByWorkspaceId(workspaceId)).thenReturn(0L);

        var response = documentService.uploadDocument(userId, workspaceId, file, "req-123",
                "Slide chương 3 môn NoSQL", "Workspace thiếu phần index nên AI không trả lời được");

        assertEquals(DocumentStatus.PENDING_APPROVAL, response.status());
        verify(documentRepository).save(any(Document.class));
        // The contribution must not reach ingestion, and therefore never reaches
        // ChromaDB nor the allowedDocumentIds authorization list.
        verify(ingestionProducer, never()).sendIngestionMessage(any(DocumentIngestionMessage.class));
    }

    @Test
    void shouldRejectContributionWithoutASummary() {
        var userId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var workspace = new Workspace(workspaceId, UUID.randomUUID(), "Test Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now());
        var member = new WorkspaceMember(workspaceId, userId, WorkspaceRole.VIEWER, WorkspaceMemberStatus.ACTIVE, userId);
        var file = new MockMultipartFile("file", "test.pdf", "application/pdf", "PDF content".getBytes());

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(member));

        assertThrows(ValidationError.class, () -> documentService.uploadDocument(
                userId, workspaceId, file, "req-123", "   ", "Có lý do"));
    }

    @Test
    void shouldRejectContributionWithoutAReason() {
        var userId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var workspace = new Workspace(workspaceId, UUID.randomUUID(), "Test Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now());
        var member = new WorkspaceMember(workspaceId, userId, WorkspaceRole.VIEWER, WorkspaceMemberStatus.ACTIVE, userId);
        var file = new MockMultipartFile("file", "test.pdf", "application/pdf", "PDF content".getBytes());

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(member));

        assertThrows(ValidationError.class, () -> documentService.uploadDocument(
                userId, workspaceId, file, "req-123", "Có mô tả", null));
    }

    @Test
    void shouldNotRequireContributionContextFromAnEditor() {
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

        assertEquals(DocumentStatus.PENDING, response.status());
    }

    @Test
    void shouldReleaseContributionToIngestionWhenEditorApproves() {
        var contributorId = UUID.randomUUID();
        var approverId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var documentId = UUID.randomUUID();
        var workspace = new Workspace(workspaceId, approverId, "Test Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now());
        var approver = new WorkspaceMember(workspaceId, approverId, WorkspaceRole.EDITOR, WorkspaceMemberStatus.ACTIVE, approverId);
        var pending = new Document(documentId, workspaceId, "key", "slide.pdf", "application/pdf",
                100L, "sha", DocumentStatus.PENDING_APPROVAL, contributorId, Instant.now());

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, approverId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(approver));
        when(documentRepository.findByWorkspaceIdAndId(workspaceId, documentId)).thenReturn(Optional.of(pending));

        var response = documentService.approveDocument(approverId, workspaceId, documentId, "req-1");

        assertEquals(DocumentStatus.PENDING, response.status());
        assertEquals(approverId, response.approvedBy());
        verify(ingestionProducer).sendIngestionMessage(any(DocumentIngestionMessage.class));
    }

    @Test
    void shouldKeepRejectedContributionOutOfIngestion() {
        var contributorId = UUID.randomUUID();
        var approverId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var documentId = UUID.randomUUID();
        var workspace = new Workspace(workspaceId, approverId, "Test Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now());
        var approver = new WorkspaceMember(workspaceId, approverId, WorkspaceRole.OWNER, WorkspaceMemberStatus.ACTIVE, approverId);
        var pending = new Document(documentId, workspaceId, "key", "slide.pdf", "application/pdf",
                100L, "sha", DocumentStatus.PENDING_APPROVAL, contributorId, Instant.now());

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, approverId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(approver));
        when(documentRepository.findByWorkspaceIdAndId(workspaceId, documentId)).thenReturn(Optional.of(pending));

        var response = documentService.rejectDocument(approverId, workspaceId, documentId, "Không liên quan tới môn học");

        assertEquals(DocumentStatus.REJECTED, response.status());
        assertEquals("Không liên quan tới môn học", response.rejectionReason());
        verify(ingestionProducer, never()).sendIngestionMessage(any(DocumentIngestionMessage.class));
    }

    @Test
    void shouldListLegacyContributionsThatHaveNoRecordedUploader() {
        var approverId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var workspace = new Workspace(workspaceId, approverId, "Test Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now());
        var approver = new WorkspaceMember(workspaceId, approverId, WorkspaceRole.OWNER, WorkspaceMemberStatus.ACTIVE, approverId);
        // Contributed before uploaded_by existed, so the contributor is unknown.
        var legacy = new Document(UUID.randomUUID(), workspaceId, "key", "old.pdf", "application/pdf",
                100L, "sha", DocumentStatus.PENDING_APPROVAL, null, Instant.now());

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, approverId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(approver));
        when(documentRepository.findByWorkspaceIdAndStatusOrderByCreatedAtDesc(
                eq(workspaceId), eq(DocumentStatus.PENDING_APPROVAL), any()))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(java.util.List.of(legacy)));
        when(userRepository.findAllById(java.util.List.of())).thenReturn(java.util.List.of());

        var page = documentService.getPendingApprovals(
                approverId, workspaceId, org.springframework.data.domain.PageRequest.of(0, 20));

        assertEquals(1, page.getTotalElements());
        assertEquals(null, page.getContent().get(0).uploadedByEmail());
    }

    @Test
    void shouldRejectApprovalAttemptFromViewer() {
        var viewerId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var documentId = UUID.randomUUID();
        var workspace = new Workspace(workspaceId, UUID.randomUUID(), "Test Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now());
        var viewer = new WorkspaceMember(workspaceId, viewerId, WorkspaceRole.VIEWER, WorkspaceMemberStatus.ACTIVE, viewerId);

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, viewerId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(viewer));

        assertThrows(AuthorizationError.class,
                () -> documentService.approveDocument(viewerId, workspaceId, documentId, "req-1"));
    }

    @Test
    void shouldRejectApprovingADocumentThatIsNotAwaitingApproval() {
        var approverId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var documentId = UUID.randomUUID();
        var workspace = new Workspace(workspaceId, approverId, "Test Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now());
        var approver = new WorkspaceMember(workspaceId, approverId, WorkspaceRole.EDITOR, WorkspaceMemberStatus.ACTIVE, approverId);
        var alreadyProcessed = new Document(documentId, workspaceId, "key", "slide.pdf", "application/pdf",
                100L, "sha", DocumentStatus.PROCESSED, approverId, Instant.now());

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, approverId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(approver));
        when(documentRepository.findByWorkspaceIdAndId(workspaceId, documentId)).thenReturn(Optional.of(alreadyProcessed));

        assertThrows(ConflictError.class,
                () -> documentService.approveDocument(approverId, workspaceId, documentId, "req-1"));
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

    @Test
    void shouldUploadMultipleDocumentsSuccessfullyWhenEditor() {
        var userId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var workspace = new Workspace(workspaceId, userId, "Test Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now());
        var member = new WorkspaceMember(workspaceId, userId, WorkspaceRole.EDITOR, WorkspaceMemberStatus.ACTIVE, userId);
        MultipartFile file1 = new MockMultipartFile("files", "doc1.pdf", "application/pdf", "PDF 1 content".getBytes());
        MultipartFile file2 = new MockMultipartFile("files", "doc2.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Doc 2 content".getBytes());
        java.util.List<MultipartFile> files = java.util.List.of(file1, file2);

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(member));
        when(documentRepository.countByWorkspaceId(workspaceId)).thenReturn(5L);
        when(documentRepository.sumByteSizeByWorkspaceId(workspaceId)).thenReturn(1000L);

        var responses = documentService.uploadDocuments(userId, workspaceId, files, "req-batch");

        assertNotNull(responses);
        assertEquals(2, responses.size());
        assertEquals(DocumentStatus.PENDING, responses.get(0).status());
        assertEquals(DocumentStatus.PENDING, responses.get(1).status());
        verify(documentRepository, times(2)).save(any(Document.class));
        verify(ingestionProducer, times(2)).sendIngestionMessage(any(DocumentIngestionMessage.class));
    }
}

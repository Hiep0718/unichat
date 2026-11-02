package com.unichat.core.document.service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import com.unichat.core.chat.service.ChatAccessService;
import com.unichat.core.chat.service.ChatActor;
import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.document.domain.Document;
import com.unichat.core.document.domain.DocumentRepository;
import com.unichat.core.document.messaging.DocumentIngestionMessage;
import com.unichat.core.document.messaging.DocumentIngestionProducer;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRole;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DocumentManifestRepairServiceTest {
    private final ChatAccessService access = mock(ChatAccessService.class);
    private final WorkspaceMemberRepository members = mock(WorkspaceMemberRepository.class);
    private final DocumentRepository documents = mock(DocumentRepository.class);
    private final DocumentIngestionProducer producer = mock(DocumentIngestionProducer.class);
    private final DocumentManifestRepairService service = new DocumentManifestRepairService(
            access, members, documents, producer);
    private final ChatActor actor = new ChatActor(UUID.randomUUID(), UUID.randomUUID(), 1);
    private final UUID workspaceId = UUID.randomUUID();

    @Test void shouldQueueEveryMissingManifestUsingActualSourceVersionAndHash() {
        var member = mock(WorkspaceMember.class);
        when(member.getRole()).thenReturn(WorkspaceRole.EDITOR);
        when(members.findByWorkspaceIdAndUserIdAndStatus(workspaceId, actor.userId(), WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(member));
        var document = mock(Document.class);
        UUID documentId = UUID.randomUUID();
        when(document.getId()).thenReturn(documentId);
        when(document.getStorageKey()).thenReturn("source-key");
        when(document.getMediaType()).thenReturn("application/pdf");
        when(document.getOriginalName()).thenReturn("Tài liệu.pdf");
        when(document.getIngestionVersion()).thenReturn(3);
        when(document.getSha256()).thenReturn("a".repeat(64));
        when(documents.findMissingManifests(workspaceId, PageRequest.of(0, 100)))
                .thenReturn(new PageImpl<>(List.of(document)));

        int queued = service.repair(actor, workspaceId, "request");

        assertEquals(1, queued);
        verify(producer).sendIngestionMessage(new DocumentIngestionMessage(documentId, workspaceId,
                "source-key", "application/pdf", "Tài liệu.pdf", "request", 3, "a".repeat(64)));
    }

    @Test void shouldDenyViewerBeforeReadingOrQueueingSources() {
        var member = mock(WorkspaceMember.class);
        when(member.getRole()).thenReturn(WorkspaceRole.VIEWER);
        when(members.findByWorkspaceIdAndUserIdAndStatus(workspaceId, actor.userId(), WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(member));

        assertThrows(AuthorizationError.class, () -> service.repair(actor, workspaceId, "request"));

        verifyNoInteractions(documents, producer);
    }

    @Test void shouldReportOnlyWorkspaceMissingManifestCountForEditor() {
        var member = mock(WorkspaceMember.class);
        when(member.getRole()).thenReturn(WorkspaceRole.EDITOR);
        when(members.findByWorkspaceIdAndUserIdAndStatus(workspaceId, actor.userId(), WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(member));
        when(documents.countMissingManifests(workspaceId)).thenReturn(4L);
        when(documents.countFailedIngestion(workspaceId)).thenReturn(1L);

        assertEquals(new DocumentManifestRepairService.RepairStatus(4L, 1L), service.status(actor, workspaceId));

        verify(documents).countMissingManifests(workspaceId);
        verify(documents).countFailedIngestion(workspaceId);
    }
}

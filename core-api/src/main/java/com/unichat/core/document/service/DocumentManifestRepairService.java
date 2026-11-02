package com.unichat.core.document.service;

import java.util.UUID;
import java.util.ArrayList;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import com.unichat.core.chat.service.ChatAccessService;
import com.unichat.core.chat.service.ChatActor;
import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.document.domain.DocumentRepository;
import com.unichat.core.document.messaging.DocumentIngestionMessage;
import com.unichat.core.document.messaging.DocumentIngestionProducer;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRole;

/** Re-ingests only legacy processed sources missing a trustworthy Core manifest. */
@Service
public class DocumentManifestRepairService {
    private final ChatAccessService access;
    private final WorkspaceMemberRepository members;
    private final DocumentRepository documents;
    private final DocumentIngestionProducer producer;

    /** Receives workspace authorization and the existing durable ingestion path. */
    public DocumentManifestRepairService(ChatAccessService access, WorkspaceMemberRepository members,
            DocumentRepository documents, DocumentIngestionProducer producer) {
        this.access = access;
        this.members = members;
        this.documents = documents;
        this.producer = producer;
    }

    /** Queues each missing manifest with the document's actual version and content hash. */
    public int repair(ChatActor actor, UUID workspaceId, String requestId) {
        authorizeEditor(actor, workspaceId);
        var messages = new ArrayList<DocumentIngestionMessage>();
        int page = 0;
        while (true) {
            var batch = documents.findMissingManifests(workspaceId, PageRequest.of(page, 100));
            for (var document : batch.getContent()) {
                messages.add(new DocumentIngestionMessage(document.getId(), workspaceId,
                        document.getStorageKey(), document.getMediaType(), document.getOriginalName(), requestId,
                        document.getIngestionVersion(), document.getSha256()));
            }
            if (!batch.hasNext()) break;
            page++;
        }
        messages.forEach(producer::sendIngestionMessage);
        return messages.size();
    }

    /** Returns current repair scope after checking workspace membership. */
    public RepairStatus status(ChatActor actor, UUID workspaceId) {
        authorizeEditor(actor, workspaceId);
        return new RepairStatus(documents.countMissingManifests(workspaceId),
                documents.countFailedIngestion(workspaceId));
    }

    /** Minimal Core-owned repair state without exposing document identifiers. */
    public record RepairStatus(long missingManifests, long failedDocuments) { }

    private void authorizeEditor(ChatActor actor, UUID workspaceId) {
        access.read(actor, workspaceId);
        var member = members.findByWorkspaceIdAndUserIdAndStatus(workspaceId, actor.userId(),
                WorkspaceMemberStatus.ACTIVE).orElseThrow(() -> new AuthorizationError("Không có quyền đồng bộ tài liệu."));
        if (member.getRole() == WorkspaceRole.VIEWER) {
            throw new AuthorizationError("Bạn cần quyền chỉnh sửa để đồng bộ tài liệu.");
        }
    }
}

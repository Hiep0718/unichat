package com.unichat.core.chat.service;

import java.nio.charset.StandardCharsets;
import java.util.Comparator;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import com.unichat.core.auth.service.SessionStateService;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.common.error.UnauthenticatedError;
import org.springframework.http.HttpStatus;
import com.unichat.core.document.domain.Document;
import com.unichat.core.document.domain.DocumentStatus;
import com.unichat.core.document.domain.DocumentRepository;
import com.unichat.core.shared.servicesecurity.RequestBinding;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;
import com.unichat.core.workspace.domain.WorkspaceStatus;

/** Reads existing workspace/document authorization without owning their lifecycle. */
@Service
public class ChatAccessService {
    private final SessionStateService sessions;
    private final WorkspaceRepository workspaces;
    private final WorkspaceMemberRepository members;
    private final DocumentRepository documents;
    /** Receives the authoritative Core repositories and current-session validator. */
    public ChatAccessService(SessionStateService sessions, WorkspaceRepository workspaces,
            WorkspaceMemberRepository members, DocumentRepository documents) {
        this.sessions = sessions; this.workspaces = workspaces; this.members = members; this.documents = documents;
    }
    /** Revalidates the account and membership before exposing source metadata. */
    public ChatSourceSnapshot read(ChatActor actor, UUID workspaceId) {
        if (!sessions.isActive(actor.userId(), actor.sessionId(), actor.securityVersion())) {
            throw new UnauthenticatedError("Phiên đăng nhập đã bị thu hồi.");
        }
        var workspace = workspaces.findById(workspaceId).filter(value -> value.getStatus() == WorkspaceStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại."));
        members.findByWorkspaceIdAndUserIdAndStatus(workspaceId, actor.userId(), WorkspaceMemberStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại."));
        List<ChatSourceSnapshot.Source> sources = documents.findAllById(documents.findAllowedDocumentIdsForWorkspaces(List.of(workspaceId)))
                .stream().map(this::source).sorted(Comparator.comparing(value -> value.documentId().toString())).toList();
        String fingerprint = fingerprint(sources);
        return new ChatSourceSnapshot(workspaceId, workspace.getPermissionVersion(), workspace.getVersion(),
                workspace.isCloudAllowed(), fingerprint, sources);
    }

    /** Authorizes the whole workspace and rejects any incomplete source manifest. */
    public ChatSourceSnapshot readWorkspaceSummary(ChatActor actor, UUID workspaceId) {
        ChatSourceSnapshot authorized = read(actor, workspaceId);
        List<Document> documentsInWorkspace = workspaceDocuments(workspaceId);
        if (documentsInWorkspace.isEmpty()) throw summaryConflict("SUMMARY_WORKSPACE_EMPTY");
        if (documentsInWorkspace.stream().anyMatch(document -> document.getStatus() != DocumentStatus.PROCESSED)) {
            throw summaryConflict("SUMMARY_SOURCES_NOT_READY");
        }
        List<ChatSourceSnapshot.Source> allSources = documentsInWorkspace.stream()
                .map(this::source).sorted(Comparator.comparing(value -> value.documentId().toString())).toList();
        var allowedIds = authorized.sources().stream().map(ChatSourceSnapshot.Source::documentId).collect(java.util.stream.Collectors.toSet());
        var workspaceIds = allSources.stream().map(ChatSourceSnapshot.Source::documentId).collect(java.util.stream.Collectors.toSet());
        if (!allowedIds.equals(workspaceIds)) throw summaryConflict("SUMMARY_SCOPE_NOT_AUTHORIZED");
        ChatSourceSnapshot snapshot = new ChatSourceSnapshot(authorized.workspaceId(),
                authorized.permissionVersion(), authorized.workspaceVersion(), authorized.cloudAllowed(),
                fingerprint(allSources), allSources);
        if (!snapshot.validSummaryManifest()) throw summaryConflict("SUMMARY_MANIFEST_MISSING");
        if (!snapshot.cloudAllowed()) throw summaryConflict("CLOUD_NOT_ALLOWED");
        return snapshot;
    }

    private List<Document> workspaceDocuments(UUID workspaceId) {
        List<Document> result = new ArrayList<>();
        int page = 0;
        while (true) {
            var batch = documents.findByWorkspaceIdExcludingDeleting(workspaceId, PageRequest.of(page, 100));
            result.addAll(batch.getContent());
            if (!batch.hasNext()) return result;
            page++;
        }
    }

    private ChatOperationError summaryConflict(String code) {
        String detail = switch (code) {
            case "SUMMARY_WORKSPACE_EMPTY" -> "Workspace chưa có tài liệu để tóm tắt.";
            case "SUMMARY_SCOPE_NOT_AUTHORIZED" -> "Không thể xác minh toàn bộ phạm vi tài liệu Workspace.";
            case "SUMMARY_SOURCES_NOT_READY" -> "Cần chờ mọi tài liệu trong Workspace xử lý xong.";
            case "SUMMARY_MANIFEST_MISSING" -> "Một số tài liệu cần được đồng bộ Vector DB trước.";
            default -> "Workspace chưa cho phép xử lý AI.";
        };
        return new ChatOperationError(code, HttpStatus.CONFLICT, detail);
    }
    private ChatSourceSnapshot.Source source(Document document) {
        return new ChatSourceSnapshot.Source(document.getId(), document.getIngestionVersion(),
                document.getSha256(), document.getOriginalName(), document.getIndexedChunkCount(),
                document.getIndexedCharacterCount(), document.getIngestionCompletedAt());
    }
    private String fingerprint(List<ChatSourceSnapshot.Source> sources) {
        String canonical = sources.stream().map(source -> source.documentId() + ":" + source.ingestionVersion()
                + ":" + source.contentHash() + ":" + source.indexedChunkCount()
                + ":" + source.indexedCharacterCount())
                .reduce("", (left, right) -> left + right + "\n");
        return RequestBinding.hash(canonical.getBytes(StandardCharsets.UTF_8));
    }
}

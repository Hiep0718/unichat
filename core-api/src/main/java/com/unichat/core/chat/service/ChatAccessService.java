package com.unichat.core.chat.service;

import java.nio.charset.StandardCharsets;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import com.unichat.core.auth.service.SessionStateService;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.common.error.UnauthenticatedError;
import com.unichat.core.document.domain.Document;
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
    private ChatSourceSnapshot.Source source(Document document) {
        return new ChatSourceSnapshot.Source(document.getId(), document.getIngestionVersion(),
                document.getSha256(), document.getOriginalName());
    }
    private String fingerprint(List<ChatSourceSnapshot.Source> sources) {
        String canonical = sources.stream().map(source -> source.documentId() + ":" + source.ingestionVersion()
                + ":" + source.contentHash()).reduce("", (left, right) -> left + right + "\n");
        return RequestBinding.hash(canonical.getBytes(StandardCharsets.UTF_8));
    }
}

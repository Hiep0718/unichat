package com.unichat.core.admin.api;

import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.document.domain.Document;
import com.unichat.core.document.domain.DocumentRepository;
import com.unichat.core.document.domain.DocumentStatus;
import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceRepository;
import com.unichat.core.workspace.domain.WorkspaceVisibility;

/**
 * Controller for extended Admin Operations: Workspace moderation, Document ingestion retry, and Audit events.
 */
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasAuthority('SCOPE_ADMIN')")
public class AdminOperationsController {

    private final WorkspaceRepository workspaceRepository;
    private final DocumentRepository documentRepository;

    public AdminOperationsController(
            WorkspaceRepository workspaceRepository,
            DocumentRepository documentRepository) {
        this.workspaceRepository = workspaceRepository;
        this.documentRepository = documentRepository;
    }

    /**
     * Lists all workspaces for administration and moderation.
     */
    @GetMapping("/workspaces")
    public ResponseEntity<Page<Map<String, Object>>> getWorkspaces(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Workspace> workspaces = workspaceRepository.findAll(pageable);

        Page<Map<String, Object>> response = workspaces.map(w -> {
            long docCount = documentRepository.countByWorkspaceId(w.getId());
            return Map.of(
                    "id", w.getId(),
                    "name", w.getName(),
                    "description", w.getDescription() != null ? w.getDescription() : "",
                    "visibility", w.getVisibility().name(),
                    "ownerId", w.getOwnerId(),
                    "documentCount", docCount,
                    "createdAt", w.getCreatedAt().toString());
        });

        return ResponseEntity.ok(response);
    }

    /**
     * Toggles workspace visibility (PUBLIC <-> PRIVATE).
     */
    @PatchMapping("/workspaces/{id}/visibility")
    @Transactional
    public ResponseEntity<Map<String, Object>> toggleWorkspaceVisibility(
            @PathVariable("id") UUID id,
            @RequestBody Map<String, String> body) {
        Workspace workspace = workspaceRepository.findById(id)
                .orElseThrow(() -> new NotFoundError("Không gian làm việc không tồn tại"));

        String nextVisibility = body.get("visibility");
        if (nextVisibility != null && !nextVisibility.isBlank()) {
            workspace.setVisibility(WorkspaceVisibility.valueOf(nextVisibility.toUpperCase()));
            workspaceRepository.save(workspace);
        }

        return ResponseEntity.ok(Map.of(
                "id", workspace.getId(),
                "name", workspace.getName(),
                "visibility", workspace.getVisibility().name()));
    }

    /**
     * Deletes offending workspace.
     */
    @DeleteMapping("/workspaces/{id}")
    @Transactional
    public ResponseEntity<Void> deleteWorkspace(@PathVariable("id") UUID id) {
        if (!workspaceRepository.existsById(id)) {
            throw new NotFoundError("Không gian làm việc không tồn tại");
        }
        workspaceRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Lists documents and their ingestion status across all workspaces.
     */
    @GetMapping("/documents")
    public ResponseEntity<Page<Map<String, Object>>> getDocuments(
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Document> documents = documentRepository.findAll(pageable);

        Page<Map<String, Object>> response = documents.map(d -> Map.of(
                "id", d.getId(),
                "originalName", d.getOriginalName(),
                "mediaType", d.getMediaType(),
                "byteSize", d.getByteSize(),
                "status", d.getStatus().name(),
                "workspaceId", d.getWorkspaceId(),
                "createdAt", d.getCreatedAt().toString()));

        return ResponseEntity.ok(response);
    }

    /**
     * Retries ingestion on failed or stuck document.
     */
    @PostMapping("/documents/{id}/retry")
    @Transactional
    public ResponseEntity<Map<String, Object>> retryDocumentIngestion(@PathVariable("id") UUID id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new NotFoundError("Tài liệu không tồn tại"));

        document.setStatus(DocumentStatus.PENDING);
        documentRepository.save(document);

        return ResponseEntity.ok(Map.of(
                "id", document.getId(),
                "originalName", document.getOriginalName(),
                "status", document.getStatus().name(),
                "message", "Đã khởi động lại tiến trình nạp tài liệu"));
    }

}

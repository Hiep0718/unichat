package com.unichat.core.document.api;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.unichat.core.document.service.DocumentService;
import com.unichat.core.shared.idempotency.IdempotencyService;

/**
 * REST controller for document upload, ingestion tracking, and lifecycle operations.
 */
@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/documents")
public class DocumentController {

    private final DocumentService documentService;
    private final IdempotencyService idempotencyService;

    public DocumentController(DocumentService documentService, IdempotencyService idempotencyService) {
        this.documentService = documentService;
        this.idempotencyService = idempotencyService;
    }

    /**
     * Lists documents in a workspace.
     */
    @GetMapping
    public ResponseEntity<Page<DocumentResponse>> getDocuments(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        UUID userId = UUID.fromString(jwt.getSubject());
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        return ResponseEntity.ok(documentService.getDocuments(userId, workspaceId, pageable));
    }

    /**
     * Uploads a document (PDF, DOCX, TXT) to workspace and triggers async ingestion via RabbitMQ.
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadDocument(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId,
            @RequestPart("file") MultipartFile file,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestHeader(value = "X-Request-Id", required = false, defaultValue = "") String requestId) {
        UUID userId = UUID.fromString(jwt.getSubject());
        String actorId = userId.toString();
        String routeKey = "/workspaces/" + workspaceId + "/documents";

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            String fileDescriptor = (file != null) ? file.getOriginalFilename() + ":" + file.getSize() : "";
            String currentHash = idempotencyService.computeHash(fileDescriptor);
            var recordOpt = idempotencyService.getRecord(actorId, routeKey, idempotencyKey);
            if (recordOpt.isPresent()) {
                var record = recordOpt.get();
                idempotencyService.handleConflict(record, currentHash);
                return ResponseEntity.status(record.getResponseStatus())
                        .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                        .body(record.getResponseBody());
            }

            IngestionJobResponse response = documentService.uploadDocument(userId, workspaceId, file, requestId);
            idempotencyService.saveRecord(actorId, routeKey, idempotencyKey, currentHash, 202, response);
            return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
        }

        IngestionJobResponse response = documentService.uploadDocument(userId, workspaceId, file, requestId);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    /**
     * Retrieves metadata for a specific document.
     */
    @GetMapping("/{documentId}")
    public ResponseEntity<DocumentResponse> getDocument(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId,
            @PathVariable("documentId") UUID documentId) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(documentService.getDocument(userId, workspaceId, documentId));
    }

    /**
     * Downloads or streams physical document file content for preview and reference reading.
     */
    @GetMapping("/{documentId}/download")
    public ResponseEntity<byte[]> downloadDocument(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId,
            @PathVariable("documentId") UUID documentId) {
        UUID userId = UUID.fromString(jwt.getSubject());
        DocumentResponse doc = documentService.getDocument(userId, workspaceId, documentId);
        byte[] bytes = documentService.downloadDocument(userId, workspaceId, documentId);

        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        try {
            if (doc.mediaType() != null) {
                mediaType = MediaType.parseMediaType(doc.mediaType());
            }
        } catch (Exception ignored) {}

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + doc.originalName() + "\"")
                .body(bytes);
    }

    /**
     * Retrieves ingestion job status for a document.
     */
    @GetMapping("/{documentId}/jobs")
    public ResponseEntity<IngestionJobResponse> getIngestionJob(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId,
            @PathVariable("documentId") UUID documentId) {
        UUID userId = UUID.fromString(jwt.getSubject());
        DocumentResponse doc = documentService.getDocument(userId, workspaceId, documentId);
        return ResponseEntity.ok(new IngestionJobResponse(doc.id(), doc.id(), doc.status(), "Trạng thái bóc tách tài liệu hiện tại"));
    }

    /**
     * Soft deletes a document (initiates Delete Saga).
     */
    @DeleteMapping("/{documentId}")
    public ResponseEntity<Void> deleteDocument(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId,
            @PathVariable("documentId") UUID documentId) {
        UUID userId = UUID.fromString(jwt.getSubject());
        documentService.deleteDocument(userId, workspaceId, documentId);
        return ResponseEntity.noContent().build();
    }
}

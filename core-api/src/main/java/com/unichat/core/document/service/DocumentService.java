package com.unichat.core.document.service;

import java.io.IOException;
import java.io.InputStream;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.ConflictError;

import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.document.api.DocumentResponse;
import com.unichat.core.document.api.IngestionJobResponse;
import com.unichat.core.document.domain.Document;
import com.unichat.core.document.domain.DocumentRepository;
import com.unichat.core.document.domain.DocumentStatus;
import com.unichat.core.document.messaging.DocumentIngestionMessage;
import com.unichat.core.document.messaging.DocumentIngestionProducer;
import com.unichat.core.document.storage.StoragePort;
import com.unichat.core.shared.util.UuidGenerator;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;
import com.unichat.core.workspace.domain.WorkspaceRole;

/**
 * Service managing document uploads, storage, and ingestion orchestration.
 */
@Service
public class DocumentService {

    private static final long MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MiB
    private static final long MAX_WORKSPACE_STORAGE = 1024 * 1024 * 1024; // 1 GiB
    private static final long MAX_WORKSPACE_DOCUMENTS = 100;

    private static final List<String> ALLOWED_MEDIA_TYPES = List.of(
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain"
    );

    private final DocumentRepository documentRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final StoragePort storagePort;
    private final DocumentIngestionProducer ingestionProducer;
    private final Clock clock;

    public DocumentService(
            DocumentRepository documentRepository,
            WorkspaceRepository workspaceRepository,
            WorkspaceMemberRepository workspaceMemberRepository,
            StoragePort storagePort,
            DocumentIngestionProducer ingestionProducer,
            Clock clock) {
        this.documentRepository = documentRepository;
        this.workspaceRepository = workspaceRepository;
        this.workspaceMemberRepository = workspaceMemberRepository;
        this.storagePort = storagePort;
        this.ingestionProducer = ingestionProducer;
        this.clock = clock;
    }

    /**
     * Lists active documents in a workspace.
     */
    @Transactional(readOnly = true)
    public Page<DocumentResponse> getDocuments(UUID userId, UUID workspaceId, Pageable pageable) {
        validateAccess(userId, workspaceId, WorkspaceRole.VIEWER);
        return documentRepository.findByWorkspaceIdExcludingDeleting(workspaceId, pageable)
                .map(DocumentResponse::from);
    }

    /**
     * Uploads and initiates asynchronous ingestion for a document.
     */
    @Transactional
    public IngestionJobResponse uploadDocument(UUID userId, UUID workspaceId, MultipartFile file, String requestId) {
        validateAccess(userId, workspaceId, WorkspaceRole.EDITOR);
        validateFile(file);

        long count = documentRepository.countByWorkspaceId(workspaceId);
        if (count >= MAX_WORKSPACE_DOCUMENTS) {
            throw new ConflictError("Vượt quá giới hạn 100 tài liệu cho mỗi Workspace");
        }

        long totalSize = documentRepository.sumByteSizeByWorkspaceId(workspaceId);
        if (totalSize + file.getSize() > MAX_WORKSPACE_STORAGE) {
            throw new ConflictError("Vượt quá giới hạn dung lượng 1 GiB cho Workspace");
        }

        Instant now = Instant.now(clock);
        UUID documentId = UuidGenerator.generateV7();
        String originalName = sanitizeFilename(file.getOriginalFilename());
        String mediaType = file.getContentType();
        String storageKey = workspaceId + "/" + documentId + "_" + originalName;

        String sha256 = computeSha256AndStore(file, storageKey);

        Document document = new Document(
                documentId,
                workspaceId,
                storageKey,
                originalName,
                mediaType,
                file.getSize(),
                sha256,
                DocumentStatus.PENDING,
                now
        );

        documentRepository.save(document);

        UUID jobId = UuidGenerator.generateV7();
        ingestionProducer.sendIngestionMessage(new DocumentIngestionMessage(
                documentId, workspaceId, storageKey, mediaType, originalName, requestId
        ));

        return new IngestionJobResponse(documentId, jobId, DocumentStatus.PENDING, "Tải lên thành công. Đang xử lý bóc tách tri thức");
    }

    /**
     * Retrieves document metadata.
     */
    @Transactional(readOnly = true)
    public DocumentResponse getDocument(UUID userId, UUID workspaceId, UUID documentId) {
        validateAccess(userId, workspaceId, WorkspaceRole.VIEWER);
        Document document = documentRepository.findByWorkspaceIdAndId(workspaceId, documentId)
                .orElseThrow(() -> new NotFoundError("Tài liệu không tồn tại trong workspace"));
        return DocumentResponse.from(document);
    }

    /**
     * Initiates soft delete saga for a document.
     */
    @Transactional
    public void deleteDocument(UUID userId, UUID workspaceId, UUID documentId) {
        validateAccess(userId, workspaceId, WorkspaceRole.OWNER);
        Document document = documentRepository.findByWorkspaceIdAndId(workspaceId, documentId)
                .orElseThrow(() -> new NotFoundError("Tài liệu không tồn tại"));

        document.setStatus(DocumentStatus.DELETING);
        document.setUpdatedAt(Instant.now(clock));
        documentRepository.save(document);

        // Physical deletion is handled asynchronously by delete saga
        storagePort.delete(document.getStorageKey());
    }

    private void validateAccess(UUID userId, UUID workspaceId, WorkspaceRole minRole) {
        workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));

        WorkspaceMember member = workspaceMemberRepository
                .findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));

        if (WorkspaceRole.VIEWER.equals(minRole) && member.getRole() == null) {
            throw new AuthorizationError("Không có quyền truy cập");
        }
        if (WorkspaceRole.EDITOR.equals(minRole) && WorkspaceRole.VIEWER.equals(member.getRole())) {
            throw new AuthorizationError("Quyền xem không thể tải lên tài liệu");
        }
        if (WorkspaceRole.OWNER.equals(minRole) && !WorkspaceRole.OWNER.equals(member.getRole())) {
            throw new AuthorizationError("Chỉ chủ sở hữu mới có quyền xóa tài liệu");
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ValidationError("Tệp tin tải lên không được để trống");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ValidationError("Dung lượng tệp vượt quá giới hạn tối đa 20 MiB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MEDIA_TYPES.contains(contentType)) {
            throw new ValidationError("Định dạng tệp không được hỗ trợ. Chỉ hỗ trợ PDF, DOCX, TXT");
        }
    }

    private String computeSha256AndStore(MultipartFile file, String storageKey) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (InputStream is = file.getInputStream();
                 DigestInputStream dis = new DigestInputStream(is, digest)) {
                storagePort.store(storageKey, dis, file.getSize());
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException | IOException e) {
            throw new ValidationError("Không thể tính checksum hoặc lưu tệp tin");
        }
    }

    private String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "document.bin";
        }
        return filename.replaceAll("[^a-zA-Z0-9.\\-_]", "_");
    }
}

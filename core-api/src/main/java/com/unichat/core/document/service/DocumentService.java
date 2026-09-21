package com.unichat.core.document.service;

import java.io.IOException;
import java.io.InputStream;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

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
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
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

    private static final Logger log = LoggerFactory.getLogger(DocumentService.class);

    private static final long MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MiB
    private static final long MAX_WORKSPACE_STORAGE = 1024 * 1024 * 1024; // 1 GiB
    private static final long MAX_WORKSPACE_DOCUMENTS = 100;
    private static final int MAX_CONTRIBUTION_SUMMARY = 500;
    private static final int MAX_CONTRIBUTION_REASON = 1000;

    private static final List<String> ALLOWED_MEDIA_TYPES = List.of(
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain"
    );

    private static final int MAX_PDF_PAGES = 500;

    private final DocumentRepository documentRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final com.unichat.core.chat.domain.CitationHistoryRepository citationHistoryRepository;
    private final StoragePort storagePort;
    private final DocumentIngestionProducer ingestionProducer;
    private final UserRepository userRepository;
    private final Clock clock;

    public DocumentService(
            DocumentRepository documentRepository,
            WorkspaceRepository workspaceRepository,
            WorkspaceMemberRepository workspaceMemberRepository,
            com.unichat.core.chat.domain.CitationHistoryRepository citationHistoryRepository,
            StoragePort storagePort,
            DocumentIngestionProducer ingestionProducer,
            UserRepository userRepository,
            Clock clock) {
        this.documentRepository = documentRepository;
        this.workspaceRepository = workspaceRepository;
        this.workspaceMemberRepository = workspaceMemberRepository;
        this.citationHistoryRepository = citationHistoryRepository;
        this.storagePort = storagePort;
        this.ingestionProducer = ingestionProducer;
        this.userRepository = userRepository;
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
        return uploadDocument(userId, workspaceId, file, requestId, null, null);
    }

    /**
     * Uploads a single document with optional contribution context.
     *
     * @param contributionSummary what the document contains
     * @param contributionReason  why the workspace needs it
     */
    @Transactional
    public IngestionJobResponse uploadDocument(UUID userId, UUID workspaceId, MultipartFile file,
                                               String requestId, String contributionSummary,
                                               String contributionReason) {
        if (file == null) {
            throw new ValidationError("Tài liệu tải lên không được để trống");
        }
        return uploadDocuments(userId, workspaceId, List.of(file), requestId,
                contributionSummary, contributionReason).get(0);
    }

    /**
     * Uploads and initiates asynchronous ingestion for multiple documents in a single batch.
     */
    @Transactional
    public List<IngestionJobResponse> uploadDocuments(UUID userId, UUID workspaceId, List<MultipartFile> files, String requestId) {
        return uploadDocuments(userId, workspaceId, files, requestId, null, null);
    }

    /**
     * Uploads documents, recording why they were contributed.
     *
     * <p>A contribution that needs approval must explain itself: the owner
     * otherwise decides on a filename alone.
     *
     * @param contributionSummary what the documents contain
     * @param contributionReason  why the workspace needs them
     */
    @Transactional
    public List<IngestionJobResponse> uploadDocuments(UUID userId, UUID workspaceId, List<MultipartFile> files,
                                                      String requestId, String contributionSummary,
                                                      String contributionReason) {
        if (files == null || files.isEmpty()) {
            throw new ValidationError("Danh sách tài liệu tải lên không được để trống");
        }

        // Any active member may contribute; VIEWER contributions await approval.
        WorkspaceMember member = validateAccess(userId, workspaceId, WorkspaceRole.VIEWER);
        boolean autoApproved = canApprove(member.getRole());

        if (!autoApproved) {
            requireContributionContext(contributionSummary, contributionReason);
        }

        for (MultipartFile f : files) {
            validateFile(f);
        }

        long currentCount = documentRepository.countByWorkspaceId(workspaceId);
        if (currentCount + files.size() > MAX_WORKSPACE_DOCUMENTS) {
            throw new ConflictError("Vượt quá giới hạn 100 tài liệu cho mỗi Workspace");
        }

        long currentTotalSize = documentRepository.sumByteSizeByWorkspaceId(workspaceId);
        long batchSize = files.stream().mapToLong(MultipartFile::getSize).sum();
        if (currentTotalSize + batchSize > MAX_WORKSPACE_STORAGE) {
            throw new ConflictError("Vượt quá giới hạn dung lượng 1 GiB cho Workspace");
        }

        List<IngestionJobResponse> responses = new ArrayList<>();
        Instant now = Instant.now(clock);

        for (MultipartFile file : files) {
            UUID documentId = UuidGenerator.generateV7();
            String originalName = sanitizeFilename(file.getOriginalFilename());
            String mediaType = file.getContentType();
            String storageKey = workspaceId + "/" + documentId + "_" + originalName;

            String sha256 = computeSha256AndStore(file, storageKey);

            DocumentStatus initialStatus =
                    autoApproved ? DocumentStatus.PENDING : DocumentStatus.PENDING_APPROVAL;

            Document document = new Document(
                    documentId,
                    workspaceId,
                    storageKey,
                    originalName,
                    mediaType,
                    file.getSize(),
                    sha256,
                    initialStatus,
                    userId,
                    now
            );

            document.describeContribution(
                    trimToNull(contributionSummary), trimToNull(contributionReason));

            documentRepository.save(document);

            UUID jobId = UuidGenerator.generateV7();

            // A contribution awaiting review is never sent to ingestion, so it
            // never reaches ChromaDB nor the allowedDocumentIds authorization list.
            if (!autoApproved) {
                responses.add(new IngestionJobResponse(documentId, jobId, DocumentStatus.PENDING_APPROVAL,
                        "Đã gửi đóng góp. Tài liệu sẽ được sử dụng sau khi chủ Workspace duyệt."));
                continue;
            }

            ingestionProducer.sendIngestionMessage(new DocumentIngestionMessage(
                    documentId, workspaceId, storageKey, mediaType, originalName, requestId
            ));

            responses.add(new IngestionJobResponse(documentId, jobId, DocumentStatus.PENDING, "Tải lên thành công. Đang bóc tách tri thức."));
        }

        return responses;
    }

    /**
     * Lists member contributions awaiting an approval decision.
     *
     * @param userId      requesting user, must be owner or editor
     * @param workspaceId workspace being moderated
     * @param pageable    pagination parameters
     */
    @Transactional(readOnly = true)
    public Page<DocumentResponse> getPendingApprovals(UUID userId, UUID workspaceId, Pageable pageable) {
        validateAccess(userId, workspaceId, WorkspaceRole.EDITOR);

        Page<Document> pending = documentRepository
                .findByWorkspaceIdAndStatusOrderByCreatedAtDesc(
                        workspaceId, DocumentStatus.PENDING_APPROVAL, pageable);

        // Resolve contributor identities in one query rather than per row.
        List<UUID> contributorIds = pending.getContent().stream()
                .map(Document::getUploadedBy)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        // A HashMap, not Map.of(): documents contributed before uploaded_by
        // existed carry a null id, and an immutable map throws on get(null).
        Map<UUID, String> emailById = userRepository.findAllById(contributorIds).stream()
                .collect(Collectors.toMap(User::getId, User::getEmail, (a, b) -> a, HashMap::new));

        return pending.map(doc -> DocumentResponse.from(doc, emailById.get(doc.getUploadedBy())));
    }

    /**
     * Counts contributions awaiting a decision, for the moderation badge.
     *
     * @param userId      requesting user, must be owner or editor
     * @param workspaceId workspace being moderated
     */
    @Transactional(readOnly = true)
    public long countPendingApprovals(UUID userId, UUID workspaceId) {
        validateAccess(userId, workspaceId, WorkspaceRole.EDITOR);
        return documentRepository.countByWorkspaceIdAndStatus(workspaceId, DocumentStatus.PENDING_APPROVAL);
    }

    /**
     * Approves a contributed document and releases it into the ingestion
     * pipeline. Only after this does the document become retrievable.
     *
     * @param userId      approving user, must be owner or editor
     * @param workspaceId workspace owning the document
     * @param documentId  contribution to approve
     * @param requestId   correlation id for the ingestion message
     */
    @Transactional
    public DocumentResponse approveDocument(UUID userId, UUID workspaceId, UUID documentId, String requestId) {
        validateAccess(userId, workspaceId, WorkspaceRole.EDITOR);

        Document document = documentRepository.findByWorkspaceIdAndId(workspaceId, documentId)
                .orElseThrow(() -> new NotFoundError("Tài liệu không tồn tại"));

        if (document.getStatus() != DocumentStatus.PENDING_APPROVAL) {
            throw new ConflictError("Tài liệu này không ở trạng thái chờ duyệt");
        }

        Instant now = Instant.now(clock);
        document.approve(userId, now);
        document.setUpdatedAt(now);
        documentRepository.save(document);

        ingestionProducer.sendIngestionMessage(new DocumentIngestionMessage(
                document.getId(),
                workspaceId,
                document.getStorageKey(),
                document.getMediaType(),
                document.getOriginalName(),
                requestId
        ));

        log.info("Approved contributed document {} in workspace {}", documentId, workspaceId);
        return DocumentResponse.from(document);
    }

    /**
     * Declines a contributed document. It stays out of retrieval permanently and
     * the contributor sees the reason.
     *
     * @param userId      deciding user, must be owner or editor
     * @param workspaceId workspace owning the document
     * @param documentId  contribution to decline
     * @param reason      explanation shown to the contributor
     */
    @Transactional
    public DocumentResponse rejectDocument(UUID userId, UUID workspaceId, UUID documentId, String reason) {
        validateAccess(userId, workspaceId, WorkspaceRole.EDITOR);

        Document document = documentRepository.findByWorkspaceIdAndId(workspaceId, documentId)
                .orElseThrow(() -> new NotFoundError("Tài liệu không tồn tại"));

        if (document.getStatus() != DocumentStatus.PENDING_APPROVAL) {
            throw new ConflictError("Tài liệu này không ở trạng thái chờ duyệt");
        }

        Instant now = Instant.now(clock);
        document.reject(userId, reason, now);
        document.setUpdatedAt(now);
        documentRepository.save(document);

        log.info("Rejected contributed document {} in workspace {}", documentId, workspaceId);
        return DocumentResponse.from(document);
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
     * Streams file bytes for document viewer and RAG reference reading.
     */
    @Transactional(readOnly = true)
    public byte[] downloadDocument(UUID userId, UUID workspaceId, UUID documentId) {
        validateAccess(userId, workspaceId, WorkspaceRole.VIEWER);
        Document document = documentRepository.findByWorkspaceIdAndId(workspaceId, documentId)
                .orElseThrow(() -> new NotFoundError("Tài liệu không tồn tại"));
        return storagePort.retrieve(document.getStorageKey());
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

        // Redact citation history excerpts for deleted document
        citationHistoryRepository.redactByDocumentId(documentId);

        // Physical deletion of storage blob
        storagePort.delete(document.getStorageKey());
    }

    /**
     * Updates document status after ingestion result arrives via RabbitMQ reply queue.
     */
    @Transactional
    public void updateIngestionResult(UUID documentId, DocumentStatus newStatus, int chunkCount) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new NotFoundError("Document not found for ingestion result: " + documentId));
        document.setStatus(newStatus);
        document.setPageOrBlockCount(chunkCount);
        document.setUpdatedAt(Instant.now(clock));
        documentRepository.save(document);
        log.info("Updated document {} status to {} with {} chunks", documentId, newStatus, chunkCount);
    }

    private WorkspaceMember validateAccess(UUID userId, UUID workspaceId, WorkspaceRole minRole) {
        workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));

        WorkspaceMember member = workspaceMemberRepository
                .findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));

        if (WorkspaceRole.VIEWER.equals(minRole) && member.getRole() == null) {
            throw new AuthorizationError("Không có quyền truy cập");
        }
        if (WorkspaceRole.EDITOR.equals(minRole) && WorkspaceRole.VIEWER.equals(member.getRole())) {
            throw new AuthorizationError("Quyền xem không thể thực hiện thao tác này");
        }
        if (WorkspaceRole.OWNER.equals(minRole) && !WorkspaceRole.OWNER.equals(member.getRole())) {
            throw new AuthorizationError("Chỉ chủ sở hữu mới có quyền xóa tài liệu");
        }
        return member;
    }

    /**
     * Whether a role may publish documents into retrieval without review.
     */
    private static boolean canApprove(WorkspaceRole role) {
        return WorkspaceRole.OWNER.equals(role) || WorkspaceRole.EDITOR.equals(role);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /**
     * A contribution that needs approval must say what it is and why it matters.
     */
    private static void requireContributionContext(String summary, String reason) {
        if (trimToNull(summary) == null) {
            throw new ValidationError("Vui lòng mô tả ngắn gọn nội dung tài liệu đóng góp");
        }
        if (trimToNull(reason) == null) {
            throw new ValidationError("Vui lòng cho biết vì sao Workspace cần tài liệu này");
        }
        if (summary.trim().length() > MAX_CONTRIBUTION_SUMMARY) {
            throw new ValidationError("Mô tả tài liệu không được vượt quá "
                    + MAX_CONTRIBUTION_SUMMARY + " ký tự");
        }
        if (reason.trim().length() > MAX_CONTRIBUTION_REASON) {
            throw new ValidationError("Lý do đóng góp không được vượt quá "
                    + MAX_CONTRIBUTION_REASON + " ký tự");
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

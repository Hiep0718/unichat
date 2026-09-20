package com.unichat.core.chat.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import com.unichat.core.chat.api.CitationResponse;
import com.unichat.core.document.domain.Document;
import com.unichat.core.document.domain.DocumentRepository;

/**
 * Shared utility for extracting and resolving citation metadata from AI Service responses.
 *
 * <p>Used by both {@link SseChatService} (streaming) and {@link ChatService} (non-streaming)
 * to eliminate duplicated citation parsing logic.</p>
 */
@Component
public class CitationExtractor {

    private final DocumentRepository documentRepository;

    public CitationExtractor(DocumentRepository documentRepository) {
        this.documentRepository = documentRepository;
    }

    /**
     * Extracts citation responses from raw AI Service citation data, resolving document file names.
     *
     * @param citationsObj raw citation data (typically {@code List<Map<String, Object>>})
     * @param workspaceId  workspace ID for fallback document name resolution
     * @return parsed list of {@link CitationResponse} with resolved file names
     */
    @SuppressWarnings("unchecked")
    public List<CitationResponse> extract(Object citationsObj, UUID workspaceId) {
        List<CitationResponse> result = new ArrayList<>();

        List<Document> wsDocs = documentRepository
                .findByWorkspaceIdExcludingDeleting(workspaceId, PageRequest.of(0, 10))
                .getContent();

        if (!(citationsObj instanceof List<?> list)) {
            return result;
        }

        int idx = 0;
        for (Object item : list) {
            if (item instanceof Map<?, ?> rawMap) {
                CitationResponse citation = parseSingleCitation(rawMap, wsDocs, idx);
                if (citation != null) {
                    result.add(citation);
                    idx++;
                }
            }
        }
        return result;
    }

    private CitationResponse parseSingleCitation(Map<?, ?> rawMap, List<Document> wsDocs, int idx) {
        try {
            String docIdStr = rawMap.get("documentId") != null ? rawMap.get("documentId").toString() : null;
            UUID docId = docIdStr != null ? UUID.fromString(docIdStr) : null;

            String fileName = resolveFileName(rawMap, docId, wsDocs, idx);
            String locator = rawMap.get("locator") != null ? rawMap.get("locator").toString() : "";
            String excerpt = rawMap.get("excerpt") != null ? rawMap.get("excerpt").toString() : "";
            double score = rawMap.get("score") instanceof Number n ? n.doubleValue() : 0.75;

            return new CitationResponse(docId, fileName, locator, excerpt, score);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String resolveFileName(Map<?, ?> rawMap, UUID docId, List<Document> wsDocs, int idx) {
        String fileName = null;
        if (rawMap.get("fileName") != null) {
            fileName = rawMap.get("fileName").toString();
        } else if (rawMap.get("documentName") != null) {
            fileName = rawMap.get("documentName").toString();
        } else if (rawMap.get("originalName") != null) {
            fileName = rawMap.get("originalName").toString();
        }

        if (fileName == null || fileName.isBlank()
                || "Tài liệu".equals(fileName) || "Tài liệu tham khảo".equals(fileName)) {
            if (docId != null) {
                fileName = documentRepository.findById(docId)
                        .map(Document::getOriginalName)
                        .orElse(null);
            }
            if ((fileName == null || fileName.isBlank()) && !wsDocs.isEmpty()) {
                fileName = wsDocs.get(idx % wsDocs.size()).getOriginalName();
            }
        }

        return (fileName == null || fileName.isBlank()) ? "Tài liệu tham khảo" : fileName;
    }
}

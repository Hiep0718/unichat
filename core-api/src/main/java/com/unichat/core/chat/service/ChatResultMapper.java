package com.unichat.core.chat.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;
import com.unichat.core.chat.api.AnswerSection;
import com.unichat.core.chat.api.CitationResponse;
import com.unichat.core.chat.api.QuestionResponse;
import com.unichat.core.chat.domain.ChatOperation;

/** Applies Core's allowlist/version checks before converting a provider result to canonical data. */
@Component
public class ChatResultMapper {
    private final ObjectMapper mapper;
    /** Receives the application's record-aware mapper. */
    public ChatResultMapper(ObjectMapper mapper) { this.mapper = mapper; }
    /** Validates structural provenance; invalid output becomes a safe completed refusal. */
    public QuestionResponse convert(ChatOperation operation, Map<String,Object> raw, UUID messageId) {
        try {
            String decision = string(raw, "decision", "REFUSE");
            if (!Set.of("ANSWER", "CLARIFY", "REFUSE").contains(decision)) throw new IllegalArgumentException("decision");
            List<CitationResponse> citations = citations(operation.sources(), raw.get("citations"));
            List<AnswerSection> sections = sections(raw.get("sections"));
            if ("ANSWER".equals(decision)) validateSections(operation.expanded(), sections, citations);
            String answer = "ANSWER".equals(decision) ? sections.stream().map(AnswerSection::content)
                    .reduce((left,right) -> left + "\n\n" + right).orElseThrow() : string(raw,"refusalReason",string(raw,"answer","Vui lòng bổ sung thông tin."));
            return new QuestionResponse(messageId, operation.conversationId(), decision, answer,
                    string(raw,"intent","UNKNOWN"), string(raw,"strategyVersion","v1.0"), citations,
                    string(raw,"refusalCode",null), operation.requestId(), number(raw.get("evidenceScore")),
                    raw.get("singleSourceWarning") instanceof Boolean value ? value : null,
                    string(raw,"warningMessage",null), operation.id(), operation.expanded() ? "EXPANDED" : "STRICT", sections);
        } catch (IllegalArgumentException error) {
            return refusal(operation, messageId, "VALIDATION_FAILED", "Không thể xác minh trích dẫn của câu trả lời.");
        }
    }
    /** Creates a policy refusal without any provider call or invented provenance. */
    public QuestionResponse refusal(ChatOperation operation, UUID messageId, String code, String detail) {
        return new QuestionResponse(messageId, operation.conversationId(), "REFUSE", detail, "UNKNOWN", "v1.0",
                List.of(), code, operation.requestId(), null, null, null, operation.id(),
                operation.expanded() ? "EXPANDED" : "STRICT", List.of());
    }
    private List<CitationResponse> citations(ChatSourceSnapshot snapshot, Object value) {
        if (value == null) return List.of();
        if (!(value instanceof List<?> values)) throw new IllegalArgumentException("citations");
        var result = new ArrayList<CitationResponse>();
        for (Object item : values) result.add(citation(snapshot, mapper.convertValue(item, CitationResponse.class)));
        if (result.stream().map(CitationResponse::citationId).distinct().count() != result.size()) throw new IllegalArgumentException("duplicate citation");
        return List.copyOf(result);
    }
    private CitationResponse citation(ChatSourceSnapshot snapshot, CitationResponse citation) {
        var source = snapshot.sources().stream().filter(item -> item.documentId().equals(citation.documentId())).findFirst().orElseThrow(() -> new IllegalArgumentException("source"));
        if (citation.ingestionVersion() == null || citation.ingestionVersion() != source.ingestionVersion()
                || !nonblank(citation.citationId()) || !nonblank(citation.chunkId()) || !nonblank(citation.locator())
                || !nonblank(citation.excerpt()) || citation.contentHash() == null || !citation.contentHash().matches("[0-9a-f]{64}")
                || !Double.isFinite(citation.score())) throw new IllegalArgumentException("provenance");
        return new CitationResponse(source.documentId(),source.fileName(),citation.locator(),citation.excerpt(),citation.score(),
                citation.citationId(),citation.chunkId(),citation.ingestionVersion(),citation.contentHash());
    }
    private List<AnswerSection> sections(Object value) {
        if (value == null) return List.of();
        if (!(value instanceof List<?> values)) throw new IllegalArgumentException("sections");
        return values.stream().map(item -> mapper.convertValue(item, AnswerSection.class)).toList();
    }
    private void validateSections(boolean expanded, List<AnswerSection> sections, List<CitationResponse> citations) {
        Set<String> ids = citations.stream().map(CitationResponse::citationId).collect(java.util.stream.Collectors.toSet());
        if (sections.isEmpty() || ids.isEmpty() || sections.stream().noneMatch(section -> "DOCUMENT".equals(section.type()))) throw new IllegalArgumentException("evidence");
        for (var section : sections) {
            if (!nonblank(section.content()) || section.claims() == null || section.claims().isEmpty()) throw new IllegalArgumentException("claims");
            if ("DOCUMENT".equals(section.type())) validateClaims(section.claims(), ids);
            else if (!expanded || !"EXTERNAL".equals(section.type()) || section.claims().stream().anyMatch(claim -> claim.citationIds() == null || !claim.citationIds().isEmpty())) throw new IllegalArgumentException("mode");
        }
    }
    private void validateClaims(List<AnswerSection.Claim> claims, Set<String> ids) {
        for (var claim : claims) if (!nonblank(claim.text()) || claim.citationIds() == null
                || claim.citationIds().isEmpty() || !ids.containsAll(claim.citationIds())) throw new IllegalArgumentException("claim citation");
    }
    private boolean nonblank(String value) { return value != null && !value.isBlank(); }
    private String string(Map<String,Object> value, String key, String fallback) {
        return value.get(key) instanceof String result ? result : fallback;
    }
    private Double number(Object value) { return value instanceof Number result ? result.doubleValue() : null; }
}

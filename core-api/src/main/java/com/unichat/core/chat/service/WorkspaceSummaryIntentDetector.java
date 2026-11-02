package com.unichat.core.chat.service;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Deterministic, versioned detector for questions asking to summarize the whole workspace.
 *
 * <p>Only genuine collection-wide overview requests match. Topic-, aspect-, section- or
 * file-scoped summaries (including {@code "tóm tắt <chủ đề> trong toàn bộ tài liệu"}) stay
 * ordinary questions so the adaptive retrieval {@code SUMMARY} intent answers them with targeted
 * evidence. Rules run on an accent-folded shadow text; the original question is never altered.</p>
 */
public final class WorkspaceSummaryIntentDetector {
    /** Rule-set version recorded in routing logs and documentation. */
    public static final String RULE_VERSION = "workspace-summary-intent-v1";

    private static final String VERB =
            "(tom tat|tom luoc|tong quan|khai quat|tong hop|summari[sz]e|summary|overview)";
    private static final String BRIDGE =
            "(?:\\s+(?:giup|dum|cho|minh|toi|em|anh|chi|ban|chung toi|lai|ngan gon|chi tiet|day du"
            + "|nhanh|so luoc|noi dung|cac y chinh|y chinh|ban|mot ban|cai nhin|ve|cua"
            + "|of|for|me|us|a|an|the|brief|full|complete|quick)){0,6}";
    private static final String COLLECTION =
            "(?:tai lieu|file|van ban|nguon|giao trinh|bai giang|documents?|files?|sources?)";
    private static final String WHOLE_SCOPE =
            "(?:(?:toan bo|tat ca|het|moi|cac|nhung|all)\\s+(?:cac\\s+|nhung\\s+|the\\s+)?" + COLLECTION
            + "|kho\\s+(?:tri thuc|tai lieu)|(?:the\\s+|this\\s+)?workspace|bo\\s+tai\\s+lieu"
            + "|(?:toan bo|tat ca)\\s+noi\\s+dung)";
    private static final Pattern DIRECT_WHOLE_SUMMARY = Pattern.compile(
            "\\b" + VERB + BRIDGE + "\\s+" + WHOLE_SCOPE + "\\b");
    private static final Pattern TOPIC_QUALIFIER = Pattern.compile(
            "\\b(?:ve|noi ve|lien quan|doi voi|theo khia canh|about|regarding|concerning|on)\\s+"
            + "(?!(?:toan bo|tat ca|het|moi|cac|nhung|kho|bo\\s+tai\\s+lieu|workspace|all|the|this)\\b)\\p{L}+");
    private static final Pattern NARROWED = Pattern.compile(
            "\\b(?:chuong|muc|phan|trang|chapter|section|page)\\b"
            + "|\\b(?:slide|bai(?!\\s+giang))\\s*(?:\\d+|nay|dau|cuoi)\\b"
            + "|\\.(?:pdf|docx?|txt|pptx?)\\b|\\b(?:so sanh|khac nhau|giong nhau|compare)\\b");
    private static final Pattern NEGATED = Pattern.compile(
            "\\b(?:khong|dung|chua|do not|dont)\\s+(?:can\\s+|phai\\s+|muon\\s+)?" + VERB + "\\b");

    private WorkspaceSummaryIntentDetector() { }

    /**
     * Reports whether the question requests a summary of every authorized document in the workspace.
     *
     * @param question validated, stripped user question
     * @return {@code true} only for an un-negated, collection-wide summary request
     */
    public static boolean isWorkspaceSummary(String question) {
        if (question == null || question.isBlank()) return false;
        String shadow = fold(question);
        if (!DIRECT_WHOLE_SUMMARY.matcher(shadow).find()) return false;
        if (NEGATED.matcher(shadow).find() || NARROWED.matcher(shadow).find()) return false;
        return !TOPIC_QUALIFIER.matcher(shadow).find();
    }

    /** Builds the accent-folded, lower-case, single-spaced shadow text used only for rule matching. */
    static String fold(String text) {
        String decomposed = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        String ascii = decomposed.replace('đ', 'd').replace('Đ', 'D').replace("'", "");
        return ascii.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").strip();
    }
}

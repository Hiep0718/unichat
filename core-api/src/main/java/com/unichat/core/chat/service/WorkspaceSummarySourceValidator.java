package com.unichat.core.chat.service;

import java.util.HashSet;
import java.util.Set;
import com.unichat.core.chat.api.WorkspaceSummaryDocumentInput;

/** Verifies that saved locators cover exactly the document's cited chunks. */
final class WorkspaceSummarySourceValidator {
    private WorkspaceSummarySourceValidator() { }

    static boolean valid(WorkspaceSummaryDocumentInput document, int ingestionVersion) {
        Set<String> cited = new HashSet<>();
        document.claims().forEach(claim -> cited.addAll(claim.chunkIds()));
        Set<String> supplied = new HashSet<>();
        for (var source : document.sources()) {
            if (!supplied.add(source.chunkId()) || source.ingestionVersion() != ingestionVersion
                    || !source.contentHash().matches("[0-9a-f]{64}")) return false;
        }
        return supplied.equals(cited);
    }
}

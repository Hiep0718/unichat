import React from 'react';
import './citation-panel.css';

export interface RefusalCardProps {
  decision: 'CLARIFY' | 'REFUSE';
  refusalReason?: string | null | undefined;
  refusalCode?: string | null | undefined;
  /** Detected question intent; OUT_OF_SCOPE questions are never escalated. */
  intent?: string | null | undefined;
  onAskCommunity?: (() => void) | undefined;
}

/**
 * Refusal codes that represent a genuine knowledge gap — the workspace has
 * documents, but none of them contain the answer. Only these can be escalated
 * to the community; the other codes are system issues (provider down, citation
 * validation failed) or user-side issues (no documents uploaded yet) that
 * posting a question would not solve.
 *
 * The evidence gate reports two different codes for the same decision:
 * `EVIDENCE_INSUFFICIENT` on the blocking endpoint and `EVIDENCE_GATE_REFUSAL`
 * on the SSE streaming endpoint. Both are accepted here.
 */
const KNOWLEDGE_GAP_CODES = ['EVIDENCE_INSUFFICIENT', 'EVIDENCE_GATE_REFUSAL'];

/**
 * The evidence gate collapses two very different situations into one refusal
 * code: a question that is off-topic or abusive (intent OUT_OF_SCOPE), and a
 * genuine on-topic question the documents cannot support. Only the latter is
 * worth another member's time, so off-topic questions are filtered out here.
 */
const OUT_OF_SCOPE_INTENT = 'OUT_OF_SCOPE';

export const RefusalCard: React.FC<RefusalCardProps> = ({
  decision,
  refusalReason,
  refusalCode,
  intent,
  onAskCommunity,
}) => {
  const isClarify = decision === 'CLARIFY';
  const isEvidenceGap =
    Boolean(refusalCode) && KNOWLEDGE_GAP_CODES.includes(refusalCode as string);
  const isKnowledgeGap = !isClarify && isEvidenceGap && intent !== OUT_OF_SCOPE_INTENT;

  return (
    <div className={`refusal-card refusal-card--${isClarify ? 'clarify' : 'refuse'}`}>
      <div className="refusal-card__header">
        <span className="material-symbols-outlined refusal-card__icon">
          {isClarify ? 'help' : 'block'}
        </span>
        <div className="refusal-card__title">
          {isClarify ? 'Cần bổ sung phạm vi câu hỏi' : 'Từ chối trả lời (Thiếu bằng chứng)'}
        </div>
      </div>
      <div className="refusal-card__reason">
        {refusalReason ||
          (isClarify
            ? 'Câu hỏi chưa rõ ràng hoặc thiếu đối tượng so sánh. Vui lòng cung cấp thêm ngữ cảnh cụ thể.'
            : 'Tài liệu hiện có trong Workspace không chứa đủ thông tin để đưa ra câu trả lời có bằng chứng xác thực.')}
      </div>

      {isKnowledgeGap && onAskCommunity && (
        <div className="refusal-card__escalation">
          <div className="refusal-card__escalation-text">
            <span className="material-symbols-outlined refusal-card__escalation-icon">lightbulb</span>
            <span>
              Thông tin này có thể chưa nằm trong tệp nào của nhóm. Hãy hỏi các thành
              viên khác, hoặc bổ sung tệp còn thiếu vào nhóm.
            </span>
          </div>
          <button
            type="button"
            className="refusal-card__escalation-btn"
            onClick={onAskCommunity}
          >
            <span className="material-symbols-outlined">forum</span>
            Hỏi cộng đồng
          </button>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { friendlyChatError } from '../chat-failures';
import { isKnowledgeGap } from '../chat-refusal-policy';
import './citation-panel.css';

export interface RefusalCardProps {
  decision: 'CLARIFY' | 'REFUSE';
  refusalReason?: string | null | undefined;
  refusalCode?: string | null | undefined;
  /** Detected question intent; OUT_OF_SCOPE questions are never escalated. */
  intent?: string | null | undefined;
  onAskCommunity?: (() => void) | undefined;
}

export const RefusalCard: React.FC<RefusalCardProps> = ({
  decision,
  refusalReason,
  refusalCode,
  intent,
  onAskCommunity,
}) => {
  const isClarify = decision === 'CLARIFY';
  const knowledgeGap = isKnowledgeGap({ decision, refusalCode, intent });
  const isSystemFailure = Boolean(refusalCode?.startsWith('PROVIDER_') || refusalCode === 'AI_MAINTENANCE');

  return (
    <div className={`refusal-card refusal-card--${isClarify ? 'clarify' : 'refuse'}`}>
      <div className="refusal-card__header">
        <span className="material-symbols-outlined refusal-card__icon">
          {isClarify ? 'help' : 'block'}
        </span>
        <div className="refusal-card__title">
          {isClarify ? 'Cần bổ sung phạm vi câu hỏi' : knowledgeGap ? 'Từ chối trả lời (Thiếu bằng chứng)' : 'Chưa thể trả lời'}
        </div>
      </div>
      <div className="refusal-card__reason">
        {isSystemFailure ? friendlyChatError({ code: refusalCode }).message : refusalReason ||
          (isClarify
            ? 'Câu hỏi chưa rõ ràng hoặc thiếu đối tượng so sánh. Vui lòng cung cấp thêm ngữ cảnh cụ thể.'
            : knowledgeGap ? 'Tài liệu hiện có trong Workspace không chứa đủ thông tin để đưa ra câu trả lời có bằng chứng xác thực.'
              : 'Chưa thể tạo câu trả lời đáng tin cậy. Vui lòng kiểm tra phạm vi câu hỏi hoặc thử lại.')}
      </div>

      {knowledgeGap && onAskCommunity && (
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

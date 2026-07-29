import React from 'react';
import './citation-panel.css';

export interface RefusalCardProps {
  decision: 'CLARIFY' | 'REFUSE';
  refusalReason?: string | null | undefined;
}

export const RefusalCard: React.FC<RefusalCardProps> = ({ decision, refusalReason }) => {
  const isClarify = decision === 'CLARIFY';

  return (
    <div className="refusal-card">
      <div className="refusal-card__title">
        {isClarify ? '🔍 Cần bổ sung thông tin câu hỏi' : '⚠️ Từ chối trả lời do thiếu bằng chứng'}
      </div>
      <div className="refusal-card__reason">
        {refusalReason ||
          (isClarify
            ? 'Câu hỏi của bạn chưa đủ thông tin hoặc thiếu đối tượng so sánh. Vui lòng làm rõ hơn.'
            : 'Tài liệu hiện có trong Workspace không chứa đủ thông tin để trả lời câu hỏi này.')}
      </div>
    </div>
  );
};

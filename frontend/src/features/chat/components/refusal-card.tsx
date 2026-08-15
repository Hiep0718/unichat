import React from 'react';
import './citation-panel.css';

export interface RefusalCardProps {
  decision: 'CLARIFY' | 'REFUSE';
  refusalReason?: string | null | undefined;
}

export const RefusalCard: React.FC<RefusalCardProps> = ({ decision, refusalReason }) => {
  const isClarify = decision === 'CLARIFY';

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
    </div>
  );
};

/**
 * Refusal/clarify card for insufficient evidence or ambiguous questions.
 */

import React from 'react';

import { Icon } from '../../../components/icon';
import './citation-panel.css';

export interface RefusalCardProps {
  decision: 'CLARIFY' | 'REFUSE';
  refusalReason?: string | null | undefined;
}

/**
 * Renders a styled card distinguishing CLARIFY (amber) from REFUSE (red) decisions.
 */
export const RefusalCard: React.FC<RefusalCardProps> = ({ decision, refusalReason }) => {
  const isClarify = decision === 'CLARIFY';
  const variant = isClarify ? 'clarify' : 'refuse';

  return (
    <div className={`refusal-card refusal-card--${variant}`}>
      <div className="refusal-card__header">
        <Icon name={isClarify ? 'info' : 'warning'} size={20} />
        <span className="refusal-card__title">
          {isClarify ? 'Cần bổ sung thông tin câu hỏi' : 'Từ chối do thiếu bằng chứng'}
        </span>
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

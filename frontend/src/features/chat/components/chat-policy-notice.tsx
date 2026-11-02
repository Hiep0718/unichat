import { Link } from 'react-router-dom';
import { Icon } from '../../../components/icon';

interface PolicyNoticeProps {
  readonly workspaceId: string;
  readonly isOwner: boolean;
}

/** Explains the authoritative workspace policy before another question can be sent. */
export function ChatPolicyNotice({ workspaceId, isOwner }: PolicyNoticeProps) {
  return (
    <section className="chat-policy-notice" role="alert" aria-labelledby="chat-policy-notice-title">
      <Icon className="chat-policy-notice__icon" name="shield_lock" size={28} />
      <div className="chat-policy-notice__content">
        <h2 className="chat-policy-notice__title" id="chat-policy-notice-title">
          AI đang tắt cho Workspace này
        </h2>
        <p>
          Chế độ riêng tư chỉ giới hạn người có thể truy cập Workspace. Nếu bật AI,
          câu hỏi và các đoạn trích tài liệu được phép vẫn có thể được gửi tới nhà
          cung cấp AI đám mây.
        </p>
        <p>{isOwner
          ? 'Chủ Workspace có thể xem lại và bật quyền xử lý bằng AI trong cài đặt.'
          : 'Chỉ chủ sở hữu mới có thể thay đổi quyền này. Vui lòng liên hệ chủ Workspace nếu bạn cần sử dụng AI.'}</p>
        {isOwner && (
          <Link className="chat-policy-notice__link" to={`/workspaces/${workspaceId}/settings?tab=privacy`}>
            <Icon name="tune" size={18} />
            Mở cài đặt AI &amp; Quyền riêng tư
          </Link>
        )}
      </div>
    </section>
  );
}

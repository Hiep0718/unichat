import { Link } from 'react-router-dom';

interface PolicyNoticeProps {
  readonly workspaceId: string;
  readonly isOwner: boolean;
}

/** Explains the authoritative workspace policy before another question can be sent. */
export function ChatPolicyNotice({ workspaceId, isOwner }: PolicyNoticeProps) {
  return <div className="refusal-card" role="alert">
    <strong>Workspace đang tắt quyền xử lý bằng AI.</strong>
    <p>{isOwner
      ? 'Bật quyền tại Cài đặt Workspace → AI & Quyền riêng tư để cho phép gửi câu hỏi và nội dung tài liệu được cấp quyền tới nhà cung cấp AI.'
      : 'Vui lòng liên hệ chủ sở hữu Workspace để bật quyền xử lý bằng AI.'}</p>
    {isOwner && <Link to={`/workspaces/${workspaceId}/settings`}>Mở cài đặt AI của Workspace</Link>}
  </div>;
}

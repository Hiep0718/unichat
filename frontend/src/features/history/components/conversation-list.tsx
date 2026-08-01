import React, { useState, useEffect } from 'react';
import {
  ConversationItem,
  fetchWorkspaceConversations,
  createWorkspaceConversation,
  deleteWorkspaceConversation,
} from '../conversation-api';
import './conversation-list.css';

interface ConversationListProps {
  workspaceId: string;
  activeId?: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  workspaceId,
  activeId,
  onSelectConversation,
  onNewConversation,
}) => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchWorkspaceConversations(workspaceId)
      .then((res) => {
        if (isMounted) {
          setConversations(res.content || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [workspaceId]);

  const handleCreate = async () => {
    try {
      const newConv = await createWorkspaceConversation(workspaceId);
      setConversations((prev) => [newConv, ...prev]);
      onSelectConversation(newConv.id);
      onNewConversation();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi tạo hội thoại');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Xóa hội thoại này?')) return;
    try {
      await deleteWorkspaceConversation(workspaceId, id);
      setConversations((prev) => prev.filter((item) => item.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Không thể xóa hội thoại');
    }
  };

  if (loading) return <div className="conversation-sidebar">Đang tải lịch sử hội thoại...</div>;

  return (
    <div className="conversation-sidebar">
      <div className="conversation-sidebar__header">
        <span className="conversation-sidebar__title">Lịch sử hội thoại</span>
        <button className="conversation-new-btn" onClick={handleCreate}>
          + Mới
        </button>
      </div>

      <div className="conversation-list">
        {conversations.map((item) => (
          <div
            key={item.id}
            className={`conversation-item ${activeId === item.id ? 'conversation-item--active' : ''}`}
            onClick={() => onSelectConversation(item.id)}
          >
            <span className="conversation-item__title">{item.title}</span>
            <button
              className="conversation-item__delete"
              onClick={(e) => handleDelete(e, item.id)}
              title="Xóa hội thoại"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

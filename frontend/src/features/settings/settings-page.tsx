import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useWorkspace } from '../workspaces/workspace-context';
import { updateWorkspace, deleteWorkspace } from '../workspaces/workspace-api';
import { MemberTable } from '../members/components/member-table';
import { Icon } from '../../components/icon';

type SettingsTab = 'general' | 'access' | 'privacy' | 'danger';

export function WorkspaceSettingsPage() {
  const { workspace, isOwner, canEdit } = useWorkspace();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // General tab state
  const [name, setName] = useState(workspace?.name || '');
  const [description, setDescription] = useState(workspace?.description || '');
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [generalMessage, setGeneralMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Access tab state
  const [visibility, setVisibility] = useState(workspace?.visibility || 'PRIVATE');
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [visibilityMessage, setVisibilityMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Danger zone state
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (!workspace) return null;

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGeneral(true);
    setGeneralMessage(null);

    try {
      await updateWorkspace(workspace.id, { name, description });
      setGeneralMessage({ type: 'success', text: 'Cập nhật thông tin Workspace thành công' });
    } catch (err: unknown) {
      setGeneralMessage({ type: 'error', text: err instanceof Error ? err.message : 'Không thể lưu thay đổi' });
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleSaveVisibility = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingVisibility(true);
    setVisibilityMessage(null);

    try {
      await updateWorkspace(workspace.id, { visibility });
      setVisibilityMessage({ type: 'success', text: 'Cập nhật quyền truy cập thành công' });
    } catch (err: unknown) {
      setVisibilityMessage({ type: 'error', text: err instanceof Error ? err.message : 'Không thể lưu quyền truy cập' });
    } finally {
      setSavingVisibility(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (deleteConfirmName !== workspace.name) return;
    setDeleting(true);

    try {
      await deleteWorkspace(workspace.id);
      navigate('/workspaces');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi xóa Workspace');
      setDeleting(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
          Cài đặt Workspace — {workspace.name}
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
          Cấu hình thông tin, quyền truy cập thành viên và tùy chọn bảo mật.
        </p>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', marginBottom: '2rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            borderBottom: activeTab === 'general' ? '2px solid #0284c7' : '2px solid transparent',
            background: 'transparent',
            color: activeTab === 'general' ? '#0284c7' : '#64748b',
            fontWeight: activeTab === 'general' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          Thông tin chung
        </button>

        {isOwner && (
          <button
            type="button"
            onClick={() => setActiveTab('access')}
            style={{
              padding: '0.75rem 1.25rem',
              border: 'none',
              borderBottom: activeTab === 'access' ? '2px solid #0284c7' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === 'access' ? '#0284c7' : '#64748b',
              fontWeight: activeTab === 'access' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            Quyền truy cập & Thành viên
          </button>
        )}

        {isOwner && (
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            style={{
              padding: '0.75rem 1.25rem',
              border: 'none',
              borderBottom: activeTab === 'privacy' ? '2px solid #0284c7' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === 'privacy' ? '#0284c7' : '#64748b',
              fontWeight: activeTab === 'privacy' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            AI & Quyền riêng tư
          </button>
        )}

        {isOwner && (
          <button
            type="button"
            onClick={() => setActiveTab('danger')}
            style={{
              padding: '0.75rem 1.25rem',
              border: 'none',
              borderBottom: activeTab === 'danger' ? '2px solid #e11d48' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === 'danger' ? '#e11d48' : '#64748b',
              fontWeight: activeTab === 'danger' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            Vùng nguy hiểm
          </button>
        )}
      </div>

      {/* Tab Contents */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneral} style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
          {generalMessage && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: '0.375rem', marginBottom: '1rem', background: generalMessage.type === 'success' ? '#f0fdf4' : '#fff1f2', color: generalMessage.type === 'success' ? '#166534' : '#9f1239' }}>
              {generalMessage.text}
            </div>
          )}

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.375rem' }}>
              Tên Workspace
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEdit || savingGeneral}
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem' }}
              required
              minLength={3}
              maxLength={100}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.375rem' }}>
              Mô tả Workspace
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canEdit || savingGeneral}
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem' }}
              maxLength={1000}
            />
          </div>

          {canEdit && (
            <button
              type="submit"
              disabled={savingGeneral}
              style={{ padding: '0.625rem 1.25rem', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '0.375rem', fontWeight: 500, cursor: 'pointer' }}
            >
              {savingGeneral ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          )}
        </form>
      )}

      {activeTab === 'access' && isOwner && (
        <div style={{ display: 'grid', gap: '2rem' }}>
          <form onSubmit={handleSaveVisibility} style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', marginBottom: '1rem' }}>Chế độ hiển thị Workspace</h3>
            {visibilityMessage && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: '0.375rem', marginBottom: '1rem', background: visibilityMessage.type === 'success' ? '#f0fdf4' : '#fff1f2', color: visibilityMessage.type === 'success' ? '#166534' : '#9f1239' }}>
                {visibilityMessage.text}
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as 'PRIVATE' | 'SHARED' | 'PUBLIC')}
                disabled={savingVisibility}
                style={{ width: '100%', padding: '0.625rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem' }}
              >
                <option value="PRIVATE">PRIVATE — Chỉ duy nhất Owner truy cập</option>
                <option value="SHARED">SHARED — Owner chỉ định danh sách người dùng được truy cập</option>
                <option value="PUBLIC">PUBLIC — Tất cả người dùng đã đăng nhập đều có quyền Đọc & Hỏi</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={savingVisibility}
              style={{ padding: '0.625rem 1.25rem', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '0.375rem', fontWeight: 500, cursor: 'pointer' }}
            >
              {savingVisibility ? 'Đang lưu...' : 'Cập nhật chế độ hiển thị'}
            </button>
          </form>

          <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', marginBottom: '1rem' }}>Danh sách Thành viên</h3>
            <MemberTable workspaceId={workspace.id} isOwner={isOwner} />
          </div>
        </div>
      )}

      {activeTab === 'privacy' && isOwner && (
        <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', marginBottom: '1rem' }}>Cấu hình AI & Quyền riêng tư</h3>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
            Mô hình suy luận Adaptive RAG của UniChat sử dụng kết hợp bộ nhúng nội bộ (multilingual-e5-base) và mô hình ngôn ngữ lớn (Gemini / Ollama fallback).
          </p>
          <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0369a1', fontWeight: 600, marginBottom: '0.5rem' }}>
              <Icon name="verified_user" size={20} />
              Cam kết bảo mật dữ liệu
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#475569', margin: 0 }}>
              Mọi tài liệu bóc tách được kiểm soát quyền tại Core API trước khi gửi allowable document IDs sang AI Service. Không tài liệu riêng tư nào bị rò rỉ giữa các Workspace khác nhau.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'danger' && isOwner && (
        <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #fda4af' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#e11d48', marginBottom: '0.5rem' }}>Xóa Workspace</h3>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.25rem' }}>
            Hành động này sẽ khởi động <strong>Delete Saga</strong> xóa toàn bộ tài liệu, vector nhúng trong ChromaDB, và lịch sử hội thoại liên quan. Hành động này KHÔNG THỂ khôi phục.
          </p>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#334155', marginBottom: '0.375rem' }}>
              Nhập tên Workspace <strong>{workspace.name}</strong> để xác nhận:
            </label>
            <input
              type="text"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={workspace.name}
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem' }}
            />
          </div>

          <button
            type="button"
            onClick={handleDeleteWorkspace}
            disabled={deleteConfirmName !== workspace.name || deleting}
            style={{
              padding: '0.625rem 1.25rem',
              background: deleteConfirmName === workspace.name ? '#e11d48' : '#fda4af',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.375rem',
              fontWeight: 600,
              cursor: deleteConfirmName === workspace.name ? 'pointer' : 'not-allowed',
            }}
          >
            {deleting ? 'Đang xóa...' : 'Tôi hiểu hậu quả, xóa Workspace này'}
          </button>
        </div>
      )}
    </div>
  );
}

export default WorkspaceSettingsPage;

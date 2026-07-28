import React, { useState, useEffect, useCallback } from 'react';
import {
  WorkspaceMemberResponse,
  WorkspaceRole,
  fetchWorkspaceMembers,
  addWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
} from '../member-api';
import { addMemberSchema } from '../member-schema';
import './member-table.css';

interface MemberTableProps {
  workspaceId: string;
  isOwner: boolean;
}

export const MemberTable: React.FC<MemberTableProps> = ({ workspaceId, isOwner }) => {
  const [members, setMembers] = useState<WorkspaceMemberResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [roleInput, setRoleInput] = useState<WorkspaceRole>('EDITOR');
  const [formError, setFormError] = useState<string | null>(null);

  const reloadMembers = useCallback(async () => {
    try {
      const data = await fetchWorkspaceMembers(workspaceId);
      setMembers(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi tải danh sách thành viên');
    }
  }, [workspaceId]);

  useEffect(() => {
    let isMounted = true;

    fetchWorkspaceMembers(workspaceId)
      .then((data) => {
        if (isMounted) {
          setMembers(data);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Lỗi tải danh sách thành viên');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [workspaceId]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validation = addMemberSchema.safeParse({ email: emailInput, role: roleInput });
    if (!validation.success) {
      setFormError(validation.error.issues[0]?.message || 'Dữ liệu không hợp lệ');
      return;
    }

    try {
      await addWorkspaceMember(workspaceId, { email: emailInput, role: roleInput });
      setIsModalOpen(false);
      setEmailInput('');
      await reloadMembers();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Không thể thêm thành viên');
    }
  };

  const handleRoleChange = async (userId: string, newRole: WorkspaceRole) => {
    try {
      await updateWorkspaceMemberRole(workspaceId, userId, { role: newRole });
      await reloadMembers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Không thể cập nhật vai trò');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa thành viên này khỏi Workspace?')) return;
    try {
      await removeWorkspaceMember(workspaceId, userId);
      await reloadMembers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Không thể xóa thành viên');
    }
  };

  if (loading) return <div className="member-management">Đang tải danh sách thành viên...</div>;
  if (error) return <div className="member-management">{error}</div>;

  return (
    <div className="member-management">
      <div className="member-management__header">
        <h3 className="member-management__title">Thành viên Workspace ({members.length})</h3>
        {isOwner && (
          <button className="member-management__add-btn" onClick={() => setIsModalOpen(true)}>
            + Thêm thành viên
          </button>
        )}
      </div>

      <div className="member-table-container">
        <table className="member-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              {isOwner && <th>Hành động</th>}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.userId}>
                <td>{member.email || member.userId}</td>
                <td>
                  {isOwner && member.role !== 'OWNER' ? (
                    <select
                      className="member-table__role-select"
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.userId, e.target.value as WorkspaceRole)}
                    >
                      <option value="EDITOR">EDITOR</option>
                      <option value="VIEWER">VIEWER</option>
                    </select>
                  ) : (
                    <span>{member.role}</span>
                  )}
                </td>
                <td>{member.status}</td>
                {isOwner && (
                  <td>
                    {member.role !== 'OWNER' && (
                      <button
                        className="member-table__remove-btn"
                        onClick={() => handleRemoveMember(member.userId)}
                      >
                        Xóa
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="member-modal-overlay">
          <div className="member-modal">
            <h4 className="member-modal__title">Thêm thành viên mới</h4>
            <form onSubmit={handleAddMember} className="member-modal__form">
              {formError && <div style={{ color: '#ef4444', fontSize: '14px' }}>{formError}</div>}
              <div className="member-modal__field">
                <label className="member-modal__label">Email người dùng</label>
                <input
                  type="email"
                  className="member-modal__input"
                  placeholder="user@unichat.edu.vn"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  required
                />
              </div>
              <div className="member-modal__field">
                <label className="member-modal__label">Vai trò</label>
                <select
                  className="member-modal__select"
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value as WorkspaceRole)}
                >
                  <option value="EDITOR">EDITOR (Được sửa/upload)</option>
                  <option value="VIEWER">VIEWER (Chỉ xem/hỏi đáp)</option>
                </select>
              </div>
              <div className="member-modal__actions">
                <button
                  type="button"
                  className="member-modal__cancel-btn"
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="member-modal__submit-btn">
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Modal form for inviting a new member to the workspace.
 * Validates email and role before submission.
 */

import { useCallback, useState } from 'react';

import { Icon } from '../../components/icon';

import { inviteMemberSchema, ROLE_LABELS } from './member-schema';
import type { InviteMemberInput } from './member-schema';

import './member-table.css';

interface InviteFormProps {
  readonly isOpen: boolean;
  readonly isPending: boolean;
  readonly serverError: string | null;
  readonly onSubmit: (data: InviteMemberInput) => void;
  readonly onClose: () => void;
}

/**
 * Renders a modal overlay with email and role fields for member invitation.
 */
export function InviteForm({
  isOpen,
  isPending,
  serverError,
  onSubmit,
  onClose,
}: InviteFormProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'EDITOR' | 'VIEWER'>('VIEWER');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setErrors({});

      const result = inviteMemberSchema.safeParse({ email, role });
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const field = issue.path[0];
          if (typeof field === 'string' && !fieldErrors[field]) {
            fieldErrors[field] = issue.message;
          }
        }
        setErrors(fieldErrors);
        return;
      }

      onSubmit(result.data);
    },
    [email, role, onSubmit],
  );

  const handleClose = useCallback(() => {
    setEmail('');
    setRole('VIEWER');
    setErrors({});
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="invite-overlay" onClick={handleClose} role="presentation">
      <div
        className="invite-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Mời thành viên"
      >
        <div className="invite-modal__header">
          <h3 className="invite-modal__title">Mời thành viên</h3>
          <button
            className="invite-modal__close"
            type="button"
            onClick={handleClose}
            aria-label="Đóng"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <form className="invite-modal__form" onSubmit={handleSubmit}>
          <div className="invite-modal__field">
            <label className="invite-modal__label" htmlFor="invite-email">
              Email
            </label>
            <input
              id="invite-email"
              className={`invite-modal__input ${errors.email ? 'invite-modal__input--error' : ''}`}
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            {errors.email && (
              <p className="invite-modal__error">{errors.email}</p>
            )}
          </div>

          <div className="invite-modal__field">
            <label className="invite-modal__label" htmlFor="invite-role">
              Vai trò
            </label>
            <select
              id="invite-role"
              className="invite-modal__select"
              value={role}
              onChange={(e) => setRole(e.target.value as 'EDITOR' | 'VIEWER')}
            >
              <option value="EDITOR">{ROLE_LABELS.EDITOR}</option>
              <option value="VIEWER">{ROLE_LABELS.VIEWER}</option>
            </select>
          </div>

          {serverError && (
            <p className="invite-modal__error">{serverError}</p>
          )}

          <div className="invite-modal__actions">
            <button
              className="invite-modal__cancel-btn"
              type="button"
              onClick={handleClose}
            >
              Hủy
            </button>
            <button
              className="invite-modal__submit-btn"
              type="submit"
              disabled={isPending}
            >
              <Icon name="send" size={16} />
              {isPending ? 'Đang gửi...' : 'Gửi lời mời'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

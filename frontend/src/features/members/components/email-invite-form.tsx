/**
 * The "Qua email" tab of the invite dialog: admits someone who already has a
 * UniChat account, by the email they signed up with.
 */
import { useState } from 'react';

import { Icon } from '../../../components/icon';
import { SelectMenu } from '../../../components/select-menu';
import { inviteMemberSchema, ROLE_LABELS } from '../member-schema';

import type { FormEvent } from 'react';
import type { InviteMemberInput } from '../member-schema';

interface EmailInviteFormProps {
  readonly isPending: boolean;
  readonly serverError: string | null;
  readonly onSubmit: (data: InviteMemberInput) => void;
  readonly onCancel: () => void;
}

/** Collects the first message per field from a failed schema parse. */
function fieldErrorsOf(issues: readonly { path: readonly PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

/** Renders the email and role fields with cancel and submit actions. */
export function EmailInviteForm({ isPending, serverError, onSubmit, onCancel }: EmailInviteFormProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'EDITOR' | 'VIEWER'>('VIEWER');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = inviteMemberSchema.safeParse({ email, role });
    if (!result.success) {
      setErrors(fieldErrorsOf(result.error.issues));
      return;
    }
    setErrors({});
    onSubmit(result.data);
  };

  return (
    <form className="invite-modal__form" onSubmit={handleSubmit} noValidate>
      <div className="invite-modal__field">
        <label className="invite-modal__label" htmlFor="invite-email">Email</label>
        <input id="invite-email" type="email" placeholder="example@email.com" value={email}
          className={`invite-modal__input ${errors.email ? 'invite-modal__input--error' : ''}`}
          onChange={(e) => setEmail(e.target.value)} autoFocus />
        {errors.email && <p className="invite-modal__error">{errors.email}</p>}
      </div>
      <div className="invite-modal__field">
        <label className="invite-modal__label" htmlFor="invite-role">Vai trò</label>
        <SelectMenu id="invite-role" variant="field" label="Vai trò" value={role}
          options={[
            { value: 'EDITOR', label: ROLE_LABELS.EDITOR },
            { value: 'VIEWER', label: ROLE_LABELS.VIEWER },
          ]}
          onChange={setRole} />
      </div>
      {serverError && <p className="invite-modal__error">{serverError}</p>}
      <div className="invite-modal__actions">
        <button className="invite-modal__cancel-btn" type="button" onClick={onCancel}>Hủy</button>
        <button className="invite-modal__submit-btn" type="submit" disabled={isPending}>
          <Icon name="send" size={16} />
          {isPending ? 'Đang gửi...' : 'Gửi lời mời'}
        </button>
      </div>
    </form>
  );
}

/**
 * Who is in a group, and the ways to change that.
 *
 * The owner's controls are hidden from everyone else, but that is for clarity
 * only — the server refuses the calls regardless, so hiding a button is never
 * what keeps a member from using it.
 */
import { useState } from 'react';

import { Icon } from '../../../components/icon';
import { EntityAvatar } from '../../../components/entity-avatar';
import { ContactPicker } from './contact-picker';
import type { ChatParticipant } from '../work-chat-api';
import './group-members-panel.css';

interface GroupMembersPanelProps {
  readonly title: string;
  readonly participants: readonly ChatParticipant[];
  readonly onAdd: (userId: string) => Promise<void>;
  readonly onRemove: (userId: string) => Promise<void>;
  readonly onLeave: () => Promise<void>;
  readonly onClose: () => void;
}

export function GroupMembersPanel({
  title,
  participants,
  onAdd,
  onRemove,
  onLeave,
  onClose,
}: GroupMembersPanelProps) {
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const iAmOwner = participants.some((participant) => participant.me && participant.role === 'OWNER');

  /** Runs one change, keeping the panel open and reporting any refusal. */
  const run = async (change: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await change();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Không thực hiện được.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="group-members" aria-label={`Thành viên của ${title}`}>
      <header className="group-members__header">
        <h2 className="group-members__title">Thành viên</h2>
        <button type="button" className="group-members__close" onClick={onClose}
          aria-label="Đóng danh sách thành viên">
          <Icon name="close" size={18} />
        </button>
      </header>

      {error && (
        <p className="group-members__error" role="alert">
          {error}
        </p>
      )}

      <ul className="group-members__list">
        {participants.map((participant) => (
          <li className="group-members__row" key={participant.userId}>
            <EntityAvatar name={participant.name} size={32} shape="circle" />
            <span className="group-members__name">
              {participant.name}
              {participant.me && <span className="group-members__you"> (bạn)</span>}
            </span>
            {participant.role === 'OWNER' && (
              <span className="group-members__owner">Chủ nhóm</span>
            )}
            {iAmOwner && !participant.me && (
              <button
                type="button"
                className="group-members__remove"
                disabled={busy}
                onClick={() => void run(() => onRemove(participant.userId))}
                aria-label={`Xóa ${participant.name} khỏi nhóm`}
              >
                <Icon name="person_remove" size={18} />
              </button>
            )}
          </li>
        ))}
      </ul>

      <footer className="group-members__actions">
        {iAmOwner && (
          <button
            type="button"
            className="group-members__add"
            onClick={() => setAdding(true)}
            disabled={busy}
          >
            <Icon name="person_add" size={18} />
            Thêm thành viên
          </button>
        )}
        <button
          type="button"
          className="group-members__leave"
          onClick={() => void run(onLeave)}
          disabled={busy}
        >
          <Icon name="logout" size={18} />
          Rời nhóm
        </button>
      </footer>

      {adding && (
        <ContactPicker
          onPick={(userId) => {
            setAdding(false);
            void run(() => onAdd(userId));
          }}
          onClose={() => setAdding(false)}
        />
      )}
    </aside>
  );
}

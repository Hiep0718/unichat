/**
 * Everything about a group in one place: its picture and name, who is in it,
 * and the way out.
 *
 * One panel rather than a separate settings dialog, because every one of these
 * answers the same question — what is this group — and splitting them would
 * mean remembering which of two places holds the one you want.
 *
 * The owner's controls are hidden from everyone else, but that is for clarity
 * only — the server refuses the calls regardless, so hiding a button is never
 * what keeps a member from using it.
 */
import { useState } from 'react';

import { Icon } from '../../../components/icon';
import { EntityAvatar } from '../../../components/entity-avatar';
import { ContactPicker } from './contact-picker';
import { GroupIdentity } from './group-identity';
import type { ChatParticipant, Conversation } from '../work-chat-api';
import './group-settings-panel.css';

interface GroupSettingsPanelProps {
  readonly conversation: Conversation;
  readonly participants: readonly ChatParticipant[];
  readonly onAdd: (userId: string) => Promise<void>;
  readonly onRemove: (userId: string) => Promise<void>;
  readonly onLeave: () => Promise<void>;
  readonly onRename: (title: string) => Promise<void>;
  readonly onPickAvatar: (file: File) => Promise<void>;
  readonly onRemoveAvatar: () => Promise<void>;
  readonly onClose: () => void;
}

export function GroupSettingsPanel({
  conversation,
  participants,
  onAdd,
  onRemove,
  onLeave,
  onRename,
  onPickAvatar,
  onRemoveAvatar,
  onClose,
}: GroupSettingsPanelProps) {
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
    <aside className="group-settings" aria-label={`Cài đặt nhóm ${conversation.title}`}>
      <header className="group-settings__header">
        <h2 className="group-settings__title">Cài đặt nhóm</h2>
        <button type="button" className="group-settings__close" onClick={onClose}
          aria-label="Đóng cài đặt nhóm">
          <Icon name="close" size={18} />
        </button>
      </header>

      {error && (
        <p className="group-settings__error" role="alert">
          {error}
        </p>
      )}

      <GroupIdentity
        conversation={conversation}
        canEdit={iAmOwner}
        busy={busy}
        onRename={(newTitle) => run(() => onRename(newTitle))}
        onPickAvatar={(file) => run(() => onPickAvatar(file))}
        onRemoveAvatar={() => run(onRemoveAvatar)}
      />

      <h3 className="group-settings__section">Thành viên ({participants.length})</h3>
      <ul className="group-settings__list">
        {participants.map((participant) => (
          <MemberRow
            key={participant.userId}
            participant={participant}
            removable={iAmOwner && !participant.me}
            busy={busy}
            onRemove={() => void run(() => onRemove(participant.userId))}
          />
        ))}
      </ul>

      <PanelActions
        canAdd={iAmOwner}
        busy={busy}
        onAdd={() => setAdding(true)}
        onLeave={() => void run(onLeave)}
      />

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

/** One person in the group, with the owner's way to take them out of it. */
function MemberRow({
  participant,
  removable,
  busy,
  onRemove,
}: {
  readonly participant: ChatParticipant;
  readonly removable: boolean;
  readonly busy: boolean;
  readonly onRemove: () => void;
}) {
  return (
    <li className="group-settings__row">
      <EntityAvatar name={participant.name} size={32} shape="circle" />
      <span className="group-settings__name">
        {participant.name}
        {participant.me && <span className="group-settings__you"> (bạn)</span>}
      </span>
      {participant.role === 'OWNER' && (
        <span className="group-settings__owner">Chủ nhóm</span>
      )}
      {removable && (
        <button
          type="button"
          className="group-settings__remove"
          disabled={busy}
          onClick={onRemove}
          aria-label={`Xóa ${participant.name} khỏi nhóm`}
        >
          <Icon name="person_remove" size={18} />
        </button>
      )}
    </li>
  );
}

/**
 * The two ways out of this panel that change the group.
 *
 * Leaving is offered to everyone, including the owner — the server hands the
 * group on to whoever joined earliest rather than leaving it unadministered.
 */
function PanelActions({
  canAdd,
  busy,
  onAdd,
  onLeave,
}: {
  readonly canAdd: boolean;
  readonly busy: boolean;
  readonly onAdd: () => void;
  readonly onLeave: () => void;
}) {
  return (
    <footer className="group-settings__actions">
      {canAdd && (
        <button
          type="button"
          className="group-settings__add"
          onClick={onAdd}
          disabled={busy}
        >
          <Icon name="person_add" size={18} />
          Thêm thành viên
        </button>
      )}
      <button
        type="button"
        className="group-settings__leave"
        onClick={onLeave}
        disabled={busy}
      >
        <Icon name="logout" size={18} />
        Rời nhóm
      </button>
    </footer>
  );
}

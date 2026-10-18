/**
 * What a group is called and what it looks like.
 *
 * Both are the owner's to change, so everyone else sees the same block without
 * the controls rather than a different layout — a member who opens settings
 * should still learn the group's name and see its picture.
 */
import { useRef, useState } from 'react';

import { Icon } from '../../../components/icon';
import { ConversationAvatar } from './conversation-avatar';
import type { Conversation } from '../work-chat-api';
import './group-identity.css';

/** Mirrors the server allowlist; anything else is refused on upload. */
const ACCEPTED_IMAGE_TYPES = 'image/png,image/jpeg,image/webp';

interface GroupIdentityProps {
  readonly conversation: Conversation;
  /** Whether the viewer owns the group, which is who may change these. */
  readonly canEdit: boolean;
  readonly onRename: (title: string) => Promise<void>;
  readonly onPickAvatar: (file: File) => Promise<void>;
  readonly onRemoveAvatar: () => Promise<void>;
  readonly busy: boolean;
}

export function GroupIdentity({
  conversation,
  canEdit,
  onRename,
  onPickAvatar,
  onRemoveAvatar,
  busy,
}: GroupIdentityProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(conversation.title);

  /** Saves the new name, unless it is unchanged or blank. */
  const save = async () => {
    const title = draft.trim();
    if (!title || title === conversation.title) {
      setEditing(false);
      setDraft(conversation.title);
      return;
    }
    await onRename(title);
    setEditing(false);
  };

  return (
    <section className="group-identity">
      <GroupPicture
        conversation={conversation}
        canEdit={canEdit}
        busy={busy}
        onPickAvatar={onPickAvatar}
        onRemoveAvatar={onRemoveAvatar}
      />

      {editing ? (
        <GroupNameForm
          draft={draft}
          busy={busy}
          onDraftChange={setDraft}
          onSave={() => void save()}
          onCancel={() => {
            setDraft(conversation.title);
            setEditing(false);
          }}
        />
      ) : (
        <div className="group-identity__name-row">
          <h3 className="group-identity__name">{conversation.title}</h3>
          {canEdit && (
            <button
              type="button"
              className="group-identity__rename"
              onClick={() => setEditing(true)}
              aria-label="Đổi tên nhóm"
              disabled={busy}
            >
              <Icon name="edit" size={16} />
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * The group's face, and the owner's two ways to change it.
 *
 * The camera sits on the picture rather than beside it as a labelled button:
 * it is the pattern every member already knows from changing their own, and
 * two pills under a 76px avatar crowded a 312px column.
 *
 * The file input is driven by that button rather than shown raw: a bare file
 * input cannot be styled to match, and its "No file chosen" text reads as a
 * failure state next to a picture that is already set.
 */
function GroupPicture({
  conversation,
  canEdit,
  busy,
  onPickAvatar,
  onRemoveAvatar,
}: {
  readonly conversation: Conversation;
  readonly canEdit: boolean;
  readonly busy: boolean;
  readonly onPickAvatar: (file: File) => Promise<void>;
  readonly onRemoveAvatar: () => Promise<void>;
}) {
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="group-identity__avatar">
      <div className="group-identity__avatar-frame">
        <ConversationAvatar conversation={conversation} size={76} />
        {canEdit && (
          <button
            type="button"
            className="group-identity__camera"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            aria-label={conversation.hasAvatar ? 'Đổi ảnh nhóm' : 'Thêm ảnh nhóm'}
            title={conversation.hasAvatar ? 'Đổi ảnh nhóm' : 'Thêm ảnh nhóm'}
          >
            <Icon name="photo_camera" size={16} />
          </button>
        )}
      </div>
      {canEdit && conversation.hasAvatar && (
        <button
          type="button"
          className="group-identity__remove-photo"
          onClick={() => void onRemoveAvatar()}
          disabled={busy}
        >
          Xóa ảnh
        </button>
      )}
      {canEdit && (
        <input
          ref={fileInput}
          className="group-identity__file"
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          aria-label="Chọn ảnh đại diện nhóm"
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Cleared so picking the same file again still fires onChange.
            event.target.value = '';
            if (file) void onPickAvatar(file);
          }}
        />
      )}
    </div>
  );
}

/** The name while it is being edited. Enter saves, Escape abandons. */
function GroupNameForm({
  draft,
  busy,
  onDraftChange,
  onSave,
  onCancel,
}: {
  readonly draft: string;
  readonly busy: boolean;
  readonly onDraftChange: (value: string) => void;
  readonly onSave: () => void;
  readonly onCancel: () => void;
}) {
  return (
    <form
      className="group-identity__form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <input
        className="group-identity__input"
        value={draft}
        maxLength={120}
        autoFocus
        aria-label="Tên nhóm"
        onChange={(event) => onDraftChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel();
        }}
      />
      <button type="submit" className="group-identity__save" disabled={busy}>
        Lưu
      </button>
      <button type="button" className="group-identity__cancel" onClick={onCancel}>
        Hủy
      </button>
    </form>
  );
}

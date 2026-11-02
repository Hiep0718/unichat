/**
 * Names a new group and picks who starts in it.
 *
 * Only people who share a group with the caller appear, because that is what
 * permits messaging them at all — a group must not become a way to reach
 * someone who could not be messaged one-to-one. The server enforces it; this
 * list is simply what it returns.
 */
import { useEffect, useState } from 'react';

import { Icon } from '../../../components/icon';
import { EntityAvatar } from '../../../components/entity-avatar';
import { MAX_GROUP_PARTICIPANTS, fetchContacts } from '../work-chat-api';
import type { Contact } from '../work-chat-api';
import './group-create-modal.css';

interface GroupCreateModalProps {
  readonly onCreate: (title: string, memberIds: readonly string[]) => Promise<void>;
  readonly onClose: () => void;
}

export function GroupCreateModal({ onCreate, onClose }: GroupCreateModalProps) {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [query, setQuery] = useState('');
  const [title, setTitle] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchContacts()
      .then(setContacts)
      .catch(() => setError('Không tải được danh sách thành viên.'));
  }, []);

  const matches = (contacts ?? []).filter((contact) =>
    contact.name.toLowerCase().includes(query.trim().toLowerCase()));
  // The caller counts towards the ceiling, so the picker stops one short of it.
  const full = picked.length >= MAX_GROUP_PARTICIPANTS - 1;
  const canCreate = title.trim().length > 0 && picked.length > 0 && !creating;

  /**
   * Adds or drops one person.
   *
   * Reading `picked` from this render rather than from an updater, because
   * the ceiling has to report itself and setting state from inside another
   * state updater is not a side effect React guarantees to run once.
   */
  const toggle = (userId: string) => {
    if (picked.includes(userId)) {
      setError(null);
      setPicked(picked.filter((id) => id !== userId));
      return;
    }
    // Said rather than silently disabled: a checkbox that does nothing when
    // clicked looks broken.
    if (full) {
      setError(`Nhóm tối đa ${MAX_GROUP_PARTICIPANTS} người, kể cả bạn.`);
      return;
    }
    setError(null);
    setPicked([...picked, userId]);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canCreate) return;
    setCreating(true);
    setError(null);
    try {
      await onCreate(title.trim(), picked);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Không tạo được nhóm.');
      setCreating(false);
    }
  };

  return (
    <div className="group-create__overlay" onClick={onClose}>
      <form
        className="group-create"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        <header className="group-create__header">
          <h2 className="group-create__title">Nhóm mới</h2>
          <button type="button" className="group-create__close" onClick={onClose}
            aria-label="Đóng">
            <Icon name="close" size={20} />
          </button>
        </header>

        <input
          className="group-create__name"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Tên nhóm"
          maxLength={120}
          aria-label="Tên nhóm"
          autoFocus
        />

        {error && (
          <p className="group-create__error" role="alert">
            {error}
          </p>
        )}

        <div className="group-create__search">
          <Icon name="search" size={18} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm thành viên..."
            aria-label="Tìm thành viên"
          />
        </div>

        <ContactChecklist
          contacts={contacts}
          matches={matches}
          picked={picked}
          onToggle={toggle}
        />

        <footer className="group-create__footer">
          <span className="group-create__count">
            Đã chọn {picked.length} người
          </span>
          <button type="submit" className="group-create__submit" disabled={!canCreate}>
            {creating ? 'Đang tạo...' : 'Tạo nhóm'}
          </button>
        </footer>
      </form>
    </div>
  );
}

interface ContactChecklistProps {
  readonly contacts: Contact[] | null;
  readonly matches: readonly Contact[];
  readonly picked: readonly string[];
  readonly onToggle: (userId: string) => void;
}

function ContactChecklist({
  contacts,
  matches,
  picked,
  onToggle,
}: ContactChecklistProps) {
  if (contacts === null) {
    return <p className="group-create__state">Đang tải...</p>;
  }
  if (matches.length === 0) {
    return (
      <p className="group-create__state">
        {contacts.length === 0
          ? 'Bạn chưa cùng nhóm với ai để tạo nhóm chat.'
          : 'Không tìm thấy thành viên phù hợp.'}
      </p>
    );
  }

  return (
    <ul className="group-create__list">
      {matches.map((contact) => {
        const chosen = picked.includes(contact.userId);
        return (
          <li key={contact.userId}>
            <label className="group-create__row">
              <input
                type="checkbox"
                checked={chosen}
                onChange={() => onToggle(contact.userId)}
              />
              <EntityAvatar name={contact.name} size={32} shape="circle" />
              <span className="group-create__row-name">{contact.name}</span>
              <span className="group-create__row-group">{contact.sharedGroup}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

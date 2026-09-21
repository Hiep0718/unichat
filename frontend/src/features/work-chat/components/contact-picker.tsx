/**
 * Picks someone to start a conversation with.
 *
 * Only people who share a group appear: the server decides that, and this list
 * is simply what it returns.
 */
import { useEffect, useState } from 'react';

import { Icon } from '../../../components/icon';
import { EntityAvatar } from '../../../components/entity-avatar';
import { fetchContacts } from '../work-chat-api';
import type { Contact } from '../work-chat-api';
import './contact-picker.css';

interface ContactPickerProps {
  readonly onPick: (userId: string) => void;
  readonly onClose: () => void;
}

export function ContactPicker({ onPick, onClose }: ContactPickerProps) {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchContacts()
      .then(setContacts)
      .catch(() => setContacts([]));
  }, []);

  const matches = (contacts ?? []).filter((contact) =>
    contact.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="contact-picker__overlay" onClick={onClose}>
      <div className="contact-picker" onClick={(event) => event.stopPropagation()}>
        <header className="contact-picker__header">
          <h2 className="contact-picker__title">Nhắn tin cho</h2>
          <button type="button" className="contact-picker__close" onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
        </header>

        <div className="contact-picker__search">
          <Icon name="search" size={18} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm thành viên..."
            aria-label="Tìm thành viên"
            autoFocus
          />
        </div>

        {contacts === null ? (
          <p className="contact-picker__state">Đang tải...</p>
        ) : matches.length === 0 ? (
          <p className="contact-picker__state">
            {contacts.length === 0
              ? 'Bạn chưa cùng nhóm với ai để nhắn tin.'
              : 'Không tìm thấy thành viên phù hợp.'}
          </p>
        ) : (
          <ul className="contact-picker__list">
            {matches.map((contact) => (
              <li key={contact.userId}>
                <button
                  type="button"
                  className="contact-picker__row"
                  onClick={() => onPick(contact.userId)}
                >
                  <EntityAvatar name={contact.name} size={32} shape="circle" />
                  <span className="contact-picker__name">{contact.name}</span>
                  <span className="contact-picker__group">{contact.sharedGroup}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

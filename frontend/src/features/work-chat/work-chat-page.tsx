/**
 * Work Chat — messaging people and groups you share a group with.
 * Route: /work-chat
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Icon } from '../../components/icon';
import { fetchCallHistory } from '../calls/call-api';
import type { CallHistoryEntryDto } from '../calls/call-api';
import { useCall } from '../calls/call-provider';
import { forgetGroupAvatar } from '../../components/avatar-image-cache';
import { ContactPicker } from './components/contact-picker';
import { ConversationList } from './components/conversation-list';
import { GroupCreateModal } from './components/group-create-modal';
import { GroupSettingsPanel } from './components/group-settings-panel';
import { MessageThread } from './components/message-thread';
import { useWorkChatSocket } from './use-work-chat-socket';
import {
  addGroupMember,
  createGroup,
  leaveGroup,
  removeGroupAvatar,
  removeGroupMember,
  renameGroup,
  uploadGroupAvatar,
} from './group-api';
import {
  fetchConversations,
  fetchMessages,
  markConversationRead,
  openConversation,
  sendMessage,
} from './work-chat-api';
import type { Conversation, DirectMessage } from './work-chat-api';
import './work-chat-page.css';

export function WorkChatPage() {
  // A profile's "Nhắn tin" button opens the conversation it just created, so
  // the page starts on that one rather than on nothing.
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(
    searchParams.get('conversation'));
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [calls, setCalls] = useState<readonly CallHistoryEntryDto[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  // Open by default: in a group, who is in it and what it is called are part
  // of reading the thread, not a dialog to go and fetch. Still closable, for
  // the reader who wants the width back.
  const [showSettings, setShowSettings] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const active = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [conversations, activeId],
  );

  /**
   * Opens a conversation.
   *
   * The settings panel is left as the reader put it rather than reset: it only
   * renders for a group anyway, and closing it on every switch would undo
   * their choice several times a session.
   */
  const selectConversation = useCallback((conversationId: string | null) => {
    setActiveId(conversationId);
  }, []);

  /** Refreshes the list. Called from handlers and callbacks, never as an
   *  effect body, so it never sets state during a render pass. */
  const loadConversations = useCallback(
    () => fetchConversations()
      .then(setConversations)
      .catch(() => setError('Không tải được danh sách trò chuyện.')),
    []);

  useEffect(() => {
    let cancelled = false;
    fetchConversations()
      .then((list) => {
        if (!cancelled) setConversations(list);
      })
      .catch(() => {
        if (!cancelled) setError('Không tải được danh sách trò chuyện.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A pushed message belongs to the open thread or to another one; either way
  // the list needs refreshing so its preview and unread badge stay true.
  const onPushed = useCallback((message: DirectMessage) => {
    setMessages((previous) =>
      message.conversationId === activeId && !previous.some((m) => m.id === message.id)
        ? [message, ...previous]
        : previous);
    void loadConversations();
  }, [activeId, loadConversations]);

  /**
   * Someone else changed a conversation. The cached picture is dropped first:
   * a replaced one is served from the same URL, so without this the other
   * members keep seeing the old image for the rest of the session.
   */
  const onListChanged = useCallback((conversationId: string) => {
    forgetGroupAvatar(conversationId);
    void loadConversations();
  }, [loadConversations]);

  const connected = useWorkChatSocket(onPushed, onListChanged);

  useEffect(() => {
    if (!activeId) {
      return;
    }
    fetchMessages(activeId)
      .then(setMessages)
      .catch(() => setError('Không tải được tin nhắn.'));

    // Failures are swallowed: a thread without its call history is still a
    // usable thread, and an error banner over the messages would overstate
    // what was lost.
    fetchCallHistory(activeId).then(setCalls).catch(() => setCalls([]));

    markConversationRead(activeId)
      .then(loadConversations)
      .catch(() => {
        // Read receipts are supplementary; the thread still works without them.
      });
  }, [activeId, loadConversations]);

  // A call that just ended is history the thread should already be showing,
  // so the list is re-read the moment the panel says it is over rather than
  // on the next time the conversation is opened.
  const callPhase = useCall()?.state.phase ?? 'idle';

  useEffect(() => {
    if (callPhase !== 'ended' || !activeId) {
      return;
    }
    fetchCallHistory(activeId).then(setCalls).catch(() => undefined);
  }, [callPhase, activeId]);

  const handleSend = async (
    body: string,
    files: readonly File[],
    onProgress?: (percent: number) => void,
  ) => {
    if (!activeId) {
      return;
    }
    const sent = await sendMessage(activeId, body, files, onProgress);
    setMessages((previous) => [sent, ...previous]);
    void loadConversations();
  };

  const handlePick = async (userId: string) => {
    setShowPicker(false);
    try {
      const conversation = await openConversation(userId);
      await loadConversations();
      selectConversation(conversation.id);
    } catch {
      setError('Không mở được cuộc trò chuyện.');
    }
  };

  const handleCreateGroup = async (title: string, memberIds: readonly string[]) => {
    const group = await createGroup(title, memberIds);
    setShowGroupForm(false);
    await loadConversations();
    selectConversation(group.id);
  };

  /**
   * Any change to the group itself — its members, its name — followed by a
   * reload, so the sidebar row and the thread header both follow.
   */
  const handleGroupChange = async (change: () => Promise<unknown>) => {
    await change();
    await loadConversations();
  };

  /**
   * A picture change, which also drops the cached blob.
   *
   * Without that the browser keeps handing out the URL it already made for
   * the old image, and the owner sees no change until a full reload.
   */
  const handleAvatarChange = async (
    change: () => Promise<unknown>,
    conversationId: string,
  ) => {
    await change();
    forgetGroupAvatar(conversationId);
    await loadConversations();
  };

  const handleLeave = async () => {
    if (!activeId) {
      return;
    }
    await leaveGroup(activeId);
    selectConversation(null);
    setMessages([]);
    await loadConversations();
  };

  // A third column only when there is something to put in it.
  const settingsVisible = active?.kind === 'GROUP' && showSettings;

  return (
    <div className={`work-chat ${settingsVisible ? 'work-chat--with-settings' : ''}`}>
      <aside className="work-chat__sidebar">
        <header className="work-chat__sidebar-header">
          <h1 className="work-chat__title">Tin nhắn</h1>
          <div className="work-chat__new-row">
            <button
              type="button"
              className="work-chat__new"
              onClick={() => setShowPicker(true)}
            >
              <Icon name="add_comment" size={18} />
              <span className="work-chat__new-label">Cuộc trò chuyện mới</span>
            </button>
            <button
              type="button"
              className="work-chat__new-group"
              onClick={() => setShowGroupForm(true)}
              aria-label="Tạo nhóm mới"
            >
              <Icon name="group_add" size={18} />
            </button>
          </div>
        </header>

        {!connected && (
          <p className="work-chat__offline" role="status">
            <Icon name="cloud_off" size={14} />
            Đang kết nối lại — tin nhắn vẫn gửi được.
          </p>
        )}

        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={selectConversation}
        />
      </aside>

      <main className="work-chat__main">
        {error && (
          <p className="work-chat__error" role="alert">
            <Icon name="error_outline" size={16} /> {error}
          </p>
        )}

        {active ? (
          <MessageThread
            conversation={active}
            messages={messages}
            calls={calls}
            onSend={handleSend}
            onToggleSettings={() => setShowSettings((open) => !open)}
            settingsOpen={showSettings}
          />
        ) : (
          <div className="work-chat__empty">
            <Icon name="forum" size={40} />
            <p>Chọn một cuộc trò chuyện, hoặc bắt đầu cuộc mới.</p>
          </div>
        )}
      </main>

      {settingsVisible && (
        <GroupSettingsPanel
          conversation={active}
          participants={active.participants}
          onAdd={(userId) => handleGroupChange(() => addGroupMember(active.id, userId))}
          onRemove={(userId) => handleGroupChange(() => removeGroupMember(active.id, userId))}
          onLeave={handleLeave}
          onRename={(title) => handleGroupChange(() => renameGroup(active.id, title))}
          onPickAvatar={(file) => handleAvatarChange(
            () => uploadGroupAvatar(active.id, file), active.id)}
          onRemoveAvatar={() => handleAvatarChange(
            () => removeGroupAvatar(active.id), active.id)}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showPicker && (
        <ContactPicker onPick={handlePick} onClose={() => setShowPicker(false)} />
      )}

      {showGroupForm && (
        <GroupCreateModal
          onCreate={handleCreateGroup}
          onClose={() => setShowGroupForm(false)}
        />
      )}
    </div>
  );
}

export default WorkChatPage;

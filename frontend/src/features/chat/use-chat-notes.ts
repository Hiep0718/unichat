import { useCallback, useEffect, useRef, useState } from 'react';
import { createStudioNote, deleteStudioNote, fetchConversationStudioNotes } from './studio-note-api';
import type { SavedNote } from './components/knowledge-studio';
import type { MessageItem } from './components/chat-message-item';

/** Saves derived notes only with an explicit readable final source message. */
export function useChatNotes(workspaceId: string, conversationId: string | undefined, messages: MessageItem[]) {
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const sequence = useRef(0);
  const page = useRef(0);
  const load = useCallback(async (requestedPage = 0) => {
    if (!conversationId) return;
    const revision = sequence.current;
    try {
      const response = await fetchConversationStudioNotes(workspaceId, conversationId, requestedPage);
      if (revision !== sequence.current) return;
      setNotes((previous) => requestedPage === 0 ? response.content : [...previous, ...response.content]);
      page.current = requestedPage;
      setMore(requestedPage + 1 < response.totalPages); setError(null);
    } catch (failure: unknown) {
      if (revision === sequence.current) setError(failure instanceof Error ? failure.message : 'Không tải được ghi chú');
    }
  }, [workspaceId, conversationId]);
  useEffect(() => { sequence.current += 1; const revision = sequence.current;
    void Promise.resolve().then(() => { if (revision === sequence.current) return load(); });
    return () => { sequence.current += 1; }; }, [load]);
  const save = async (title: string, content: string, sourceMessageId?: string) => {
    const source = messages.find((message) => message.id === sourceMessageId);
    if (!conversationId || !source || source.isStreaming || source.redacted || source.response?.redacted || source.response?.decision !== 'ANSWER') {
      setError('Chỉ lưu ghi chú từ một câu trả lời đã hoàn tất và còn quyền nguồn.'); return;
    }
    const revision = sequence.current;
    try {
      await createStudioNote(workspaceId, conversationId, { title, content, sourceMessageId: source.id, noteType: 'STUDIO_NOTE' });
      if (revision === sequence.current) await load();
    } catch (failure: unknown) { if (revision === sequence.current) setError(failure instanceof Error ? failure.message : 'Không lưu được ghi chú'); }
  };
  const remove = async (noteId: string) => {
    if (!conversationId) return;
    const revision = sequence.current;
    try { await deleteStudioNote(workspaceId, conversationId, noteId); if (revision === sequence.current) await load(); }
    catch (failure: unknown) { if (revision === sequence.current) setError(failure instanceof Error ? failure.message : 'Không xóa được ghi chú'); }
  };
  return { notes: conversationId ? notes : [], error: conversationId ? error : null, more: Boolean(conversationId) && more,
    save, remove, loadMore: () => load(page.current + 1) };
}

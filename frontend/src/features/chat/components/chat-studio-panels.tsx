import { useState } from 'react';
import { KnowledgeStudio } from './knowledge-studio';
import { KnowledgeStudioModal } from './knowledge-studio-modal';
import { SavedNoteModal } from './saved-note-modal';
import type { SavedNote, StudioToolType } from './knowledge-studio';
import type { CitationItem } from '../chat-types';
import type { MessageItem } from './chat-message-item';
import type { useChatNotes } from '../use-chat-notes';

interface StudioProps {
  workspaceId: string; workspaceName: string | undefined; messages: MessageItem[]; selectedCitation: CitationItem | null;
  notes: ReturnType<typeof useChatNotes>; onSelectCitation: (citation: CitationItem) => void;
  onClearCitation: () => void; onClose: () => void; onSend: (question: string) => void;
}

/** Keeps the existing studio widgets, while derived-note saves require explicit source binding. */
export function ChatStudioPanels({ workspaceId, workspaceName, messages, selectedCitation, notes,
  onSelectCitation, onClearCitation, onClose, onSend }: StudioProps) {
  const [tab, setTab] = useState<'STUDIO' | 'CITATIONS'>('STUDIO');
  const [tool, setTool] = useState<StudioToolType | null>(null);
  const [note, setNote] = useState<SavedNote | null>(null);
  const sources = messages.filter((message) => !message.redacted && !message.isStreaming && !message.response?.redacted);
  const citations = sources.flatMap((message) => message.response?.citations ?? []);
  const save = (title: string, content: string) => { void notes.save(title, content); };
  return <><aside>
    <KnowledgeStudio workspaceId={workspaceId} workspaceName={workspaceName} citations={citations}
      selectedCitation={selectedCitation} savedNotes={notes.notes} activeTab={selectedCitation ? 'CITATIONS' : tab}
      onTabChange={(value) => { onClearCitation(); setTab(value); }} onSelectCitation={onSelectCitation}
      onClearSelectedCitation={onClearCitation} onSelectTool={setTool} onSaveNote={save}
      onDeleteNote={(id) => void notes.remove(id)} onSelectNote={setNote} onClosePanel={onClose} />
    {notes.more && <button type="button" onClick={() => void notes.loadMore()}>Tải thêm ghi chú</button>}
  </aside>
    {tool && <KnowledgeStudioModal toolType={tool} workspaceName={workspaceName}
      answerContent={sources.filter((message) => message.role === 'ASSISTANT').slice(-3).map((message) => message.content).join('\n\n')}
      citations={citations} onSaveNote={save} onClose={() => setTool(null)} />}
    {note && <SavedNoteModal note={note} onClose={() => setNote(null)} onDeleteNote={(id) => void notes.remove(id)} onSendToChat={onSend} />}
  </>;
}

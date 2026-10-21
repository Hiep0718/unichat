import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChatHeader } from './components/chat-header';
import { ChatWelcome } from './components/chat-welcome';
import { ChatMessageItem } from './components/chat-message-item';
import { ChatInputForm } from './components/chat-input-form';
import { ChatStudioPanels } from './components/chat-studio-panels';
import { ChatPolicyNotice } from './components/chat-policy-notice';
import { useChatSession } from './use-chat-session';
import { useChatNotes } from './use-chat-notes';
import { readCurrentCitation } from './read-citation';
import { getSessionSnapshot } from '../../lib/session-store';
import { useWorkspace } from '../workspaces/workspace-context';
import { fetchWorkspaceDocuments } from '../documents/document-api';
import { CreatePostModal } from '../community/components/create-post-modal';
import type { DocumentResponse } from '../documents/document-api';
import type { MessageItem } from './components/chat-message-item';
import type { CitationItem } from './chat-types';
import './chat-page.css';

interface ChatPageProps { readonly workspaceId?: string | undefined; readonly conversationId?: string | undefined }

function communityDraft(message: MessageItem, messages: MessageItem[]): { title: string; body: string } | null {
  const index = messages.findIndex((candidate) => candidate.id === message.id);
  const question = messages.slice(0, index).reverse().find((candidate) => candidate.role === 'USER')?.content;
  if (!question) return null;
  const body = message.response?.decision === 'REFUSE'
    ? 'Tài liệu hiện có chưa đủ căn cứ để trả lời. Mong các thành viên bổ sung thông tin giúp mình.'
    : `Mình cần thêm thông tin về câu hỏi này.\n\n${message.content.slice(0, 800).split('\n').map((line) => `> ${line}`).join('\n')}`;
  return { title: question.slice(0, 200), body };
}

/** Uses one operation coordinator for new questions, history, retries and cancellation. */
export function ChatPage({ workspaceId: suppliedWorkspace, conversationId: suppliedConversation }: ChatPageProps) {
  const params = useParams<{ workspaceId?: string; conversationId?: string }>();
  const [search] = useSearchParams();
  const workspace = useWorkspace();
  const workspaceId = suppliedWorkspace ?? params.workspaceId ?? workspace?.workspace?.id ?? '';
  const initialId = suppliedConversation ?? params.conversationId ?? search.get('conversationId') ?? undefined;
  return <ChatSessionPage key={`${workspaceId}/${initialId ?? 'new'}`} workspaceId={workspaceId} conversationId={initialId} />;
}

function ChatSessionPage({ workspaceId = '', conversationId: initialId }: ChatPageProps) {
  const navigate = useNavigate();
  const workspace = useWorkspace();
  const chat = useChatSession(workspaceId, initialId);
  const notes = useChatNotes(workspaceId, chat.conversationId, chat.messages);
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [selected, setSelected] = useState<CitationItem | null>(null);
  const [studio, setStudio] = useState(false);
  const [citationError, setCitationError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ title: string; body: string } | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const lifecycle = { active: true };
    if (!workspaceId) return;
    void fetchWorkspaceDocuments(workspaceId, 0, 20).then((page) => {
      if (lifecycle.active) setDocuments(page.content);
    }).catch(() => { if (lifecycle.active) setDocuments([]); });
    return () => { lifecycle.active = false; };
  }, [workspaceId]);
  useEffect(() => { end.current?.scrollIntoView?.({ block: 'end' }); }, [chat.messages]);
  const selectCitation = async (citation: CitationItem) => {
    setSelected(null); setCitationError(null);
    const generation = getSessionSnapshot().generation;
    const message = chat.messages.find((item) => item.response?.citations.some((source) => source === citation));
    if (!message || !chat.conversationId) return;
    try { const verified = await readCurrentCitation(workspaceId, chat.conversationId, message, citation);
      if (generation === getSessionSnapshot().generation) { setSelected(verified); setStudio(true); } }
    catch (failure: unknown) { if (generation === getSessionSnapshot().generation) setCitationError(failure instanceof Error ? failure.message : 'Không mở được nguồn'); }
  };
  const policyBlocked = workspace.workspace?.cloudAllowed === false;
  const send = (question: string, expanded = false) => { if (workspaceId && !policyBlocked) void chat.send(question, expanded); };
  return <div className={`chat-layout ${studio ? 'chat-layout--studio-open' : ''}`}>
    <div className="chat-page"><ChatHeader workspaceId={workspaceId} workspaceName={workspace?.workspace?.name}
      conversationTitle={chat.title} messageCount={chat.messages.length} onNewChat={() => { chat.reset(); setSelected(null); }}
      onToggleStudio={() => setStudio((value) => !value)} isStudioOpen={studio} hasDrawerOpen={Boolean(selected)} />
      <div className="chat-page__main-content"><div className="chat-page__chat-area">
        <div className="chat-page__messages-body">
          {policyBlocked && <ChatPolicyNotice workspaceId={workspaceId} isOwner={workspace.isOwner} />}
          {chat.initialLoading && <p role="status">Đang tải lịch sử hội thoại…</p>}
          {chat.older && <button type="button" onClick={() => void chat.loadOlder()}>Tải tin nhắn cũ hơn</button>}
          {!chat.initialLoading && !chat.messages.length && <ChatWelcome workspaceName={workspace?.workspace?.name} documents={documents} onSelectPrompt={send} />}
          {chat.messages.map((message) => <ChatMessageItem key={message.id} message={message} onSelectCitation={selectCitation}
            onSaveNote={(title, content, sourceId) => void notes.save(title, content, sourceId)}
            onAskCommunity={(answer) => setDraft(communityDraft(answer, chat.messages))} />)}
          {(chat.error || notes.error || citationError) && <p role="alert">{chat.error ?? notes.error ?? citationError}</p>}
          {chat.canRetry && <button type="button" onClick={() => void chat.retry()}>Kiểm tra lại yêu cầu này</button>}
          <div ref={end} />
        </div><ChatInputForm onSend={send} loading={chat.loading} disabled={policyBlocked} onCancel={() => void chat.cancel()} />
      </div>{studio && <ChatStudioPanels workspaceId={workspaceId} workspaceName={workspace?.workspace?.name}
        messages={chat.messages} selectedCitation={selected} onSelectCitation={selectCitation} onClearCitation={() => setSelected(null)}
        notes={notes} onClose={() => setStudio(false)} onSend={send} />}</div>
    </div>
    {draft && <CreatePostModal preselectedWorkspaceId={workspaceId} initialTitle={draft.title} initialBody={draft.body}
      initialLabel="QUESTION" heading="Hỏi cộng đồng" onClose={() => setDraft(null)}
      onCreated={(id, postId) => { setDraft(null); navigate(`/feed/posts/${postId}?workspaceId=${id}`); }}
      onOpenExisting={(id, postId) => { setDraft(null); navigate(`/feed/posts/${postId}?workspaceId=${id}`); }} />}
  </div>;
}
export default ChatPage;

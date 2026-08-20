import { useParams } from 'react-router-dom';
import { ChatPage } from '../chat/chat-page';

export function ConversationPage() {
  const { workspaceId, conversationId } = useParams<{ workspaceId: string; conversationId: string }>();
  return <ChatPage workspaceId={workspaceId} conversationId={conversationId} />;
}

export default ConversationPage;

import { Text, TouchableOpacity, View } from 'react-native';
import { UCIcon } from '../../components/uc-icon';
import { formatRelativeTime } from '../../lib/format-time';
import { conversationListStyles as styles } from './conversation-list-styles';
import type { ConversationItem } from '../../types/api';
interface Props { items: ConversationItem[]; query: string; deletingId: string | null;
  onOpen: (id: string) => void; onDelete: (item: ConversationItem) => void; onNew: () => void }

/** Renders loaded conversations without pretending that a partial page is the whole history. */
export function ConversationListBody({ items, query, deletingId, onOpen, onDelete, onNew }: Props) {
  const filtered = items.filter((item) => item.title.toLowerCase().includes(query.trim().toLowerCase()));
  if (filtered.length === 0) return <View style={styles.emptyStateContainer} testID="conversations-empty-state">
    <Text style={styles.emptyTitle}>{query ? 'Không tìm thấy cuộc trò chuyện trong các trang đã tải' : 'Chưa có cuộc trò chuyện nào'}</Text>
    {!query && <TouchableOpacity onPress={onNew}><Text style={styles.emptyActionBtnText}>Bắt đầu trò chuyện mới</Text></TouchableOpacity>}
  </View>;
  return <View style={styles.listWrap}><Text style={styles.listCountText}>{filtered.length} cuộc trò chuyện</Text>
    {filtered.map((item) => <TouchableOpacity key={item.id} style={styles.card} onPress={() => onOpen(item.id)} testID={`conversation-item-${item.id}`}>
      <View style={styles.cardIconBox}><UCIcon name="chat-bubble-outline" size={18} color="#00687A" /></View>
      <View style={styles.cardContent}><Text style={styles.cardTitle} numberOfLines={2}>{item.title || 'Cuộc trò chuyện'}</Text>
        <Text style={styles.cardTime}>{formatRelativeTime(item.lastMessageAt || item.createdAt)}</Text></View>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item)} disabled={deletingId === item.id}
        accessibilityLabel={`Xóa ${item.title}`} testID={`delete-conversation-${item.id}`}><UCIcon name="delete-outline" size={18} color="#94A3B8" /></TouchableOpacity>
    </TouchableOpacity>)}
  </View>;
}

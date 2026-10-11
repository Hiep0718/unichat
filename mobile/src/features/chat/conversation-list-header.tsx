import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { UCIcon } from '../../components/uc-icon';
import { conversationListStyles as styles } from './conversation-list-styles';
interface Props { top: number; name?: string | undefined; query: string; onQuery: (value: string) => void; onBack: () => void; onNew: () => void }

/** Shows conversation navigation and a filter limited to the loaded pages. */
export function ConversationListHeader({ top, name, query, onQuery, onBack, onNew }: Props) {
  return <View style={[styles.header, { paddingTop: Math.max(top, 16) + 4 }]}>
    <View style={styles.headerRow}>
      <TouchableOpacity style={styles.headerCircleBtn} onPress={onBack} accessibilityLabel="Quay lại" testID="conversations-back-btn">
        <UCIcon name="arrow-back" size={20} color="#0F172A" /></TouchableOpacity>
      <View style={styles.headerTitleWrap}><Text style={styles.headerTitle}>Lịch sử hội thoại</Text>
        {name && <Text style={styles.headerSubtitle}>{name}</Text>}</View>
      <TouchableOpacity style={styles.newChatBtn} onPress={onNew} testID="conversations-new-chat-btn">
        <UCIcon name="add" size={17} color="#FFFFFF" /><Text style={styles.newChatBtnText}>Chat mới</Text></TouchableOpacity>
    </View><View style={styles.searchBar}><UCIcon name="search" size={17} color="#64748B" />
      <TextInput style={styles.searchInput} placeholder="Tìm trong các trang đã tải…" value={query} onChangeText={onQuery} testID="conversations-search-input" />
      {query && <TouchableOpacity onPress={() => onQuery('')} accessibilityLabel="Xóa tìm kiếm"><UCIcon name="close" size={15} color="#94A3B8" /></TouchableOpacity>}
    </View>
  </View>;
}

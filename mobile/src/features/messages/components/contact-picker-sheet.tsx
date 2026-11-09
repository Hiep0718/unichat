import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UCIcon } from '../../../components/uc-icon';
import { dock, messenger } from '../../../design/tokens';
import { MemberAvatar } from '../../account/components/member-avatar';
import { messagesApi } from '../messages-api';

import type { Contact } from '../messages-api';

interface ContactPickerSheetProps {
  readonly visible: boolean;
  /** Đang mở cuộc trò chuyện với người này; khoá danh sách để khỏi bấm hai lần. */
  readonly pendingUserId: string | null;
  readonly onPick: (contact: Contact) => void;
  readonly onClose: () => void;
}

function matches(contact: Contact, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return `${contact.name} ${contact.sharedGroup}`.toLowerCase().includes(needle);
}

/**
 * Chọn một người cùng nhóm để mở tin nhắn riêng.
 *
 * Chỉ người chung ít nhất một nhóm mới hiện ra, vì đó là điều máy chủ dùng để
 * cho phép nhắn tin; danh sách này không phải danh bạ toàn hệ thống.
 */
export function ContactPickerSheet({ visible, pendingUserId, onPick, onClose }: ContactPickerSheetProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const contacts = useQuery({
    queryKey: ['work-chat', 'contacts'],
    queryFn: () => messagesApi.fetchContacts(),
    enabled: visible,
  });
  const shown = useMemo(
    () => (contacts.data ?? []).filter((contact) => matches(contact, query)),
    [contacts.data, query],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Đóng" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>Tin nhắn mới</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Đóng">
            <UCIcon name="close" size={22} color={messenger.chipInk} />
          </Pressable>
        </View>
        <View style={styles.search}>
          <UCIcon name="search" size={18} color={messenger.chipInk} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Tìm người cùng nhóm..."
            placeholderTextColor="#94A3B8"
            testID="contact-search-input"
          />
        </View>
        {contacts.isLoading ? (
          <ActivityIndicator style={styles.state} color={dock.accent} />
        ) : contacts.isError ? (
          <Pressable style={styles.state} onPress={() => void contacts.refetch()}>
            <Text style={styles.stateText}>Không tải được danh sách. Chạm để thử lại.</Text>
          </Pressable>
        ) : (
          <FlatList
            data={shown}
            keyExtractor={(contact) => contact.userId}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={[styles.state, styles.stateText]}>
                {query ? 'Không tìm thấy ai phù hợp.' : 'Bạn chưa cùng nhóm với ai để nhắn tin.'}
              </Text>
            }
            renderItem={({ item }) => (
              <ContactRow contact={item} pending={pendingUserId === item.userId} disabled={pendingUserId !== null} onPick={onPick} />
            )}
          />
        )}
      </View>
    </Modal>
  );
}

interface ContactRowProps {
  readonly contact: Contact;
  readonly pending: boolean;
  readonly disabled: boolean;
  readonly onPick: (contact: Contact) => void;
}

function ContactRow({ contact, pending, disabled, onPick }: ContactRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPick(contact)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Nhắn tin cho ${contact.name}`}
      testID={`contact-row-${contact.userId}`}
    >
      <MemberAvatar name={contact.name} size={40} />
      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>{contact.name}</Text>
        <Text style={styles.rowGroup} numberOfLines={1}>Cùng nhóm {contact.sharedGroup}</Text>
      </View>
      {pending && <ActivityIndicator color={dock.accent} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.35)' },
  sheet: {
    maxHeight: '75%',
    minHeight: '45%',
    backgroundColor: messenger.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: messenger.line },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: { fontSize: 18, fontFamily: 'Inter_700Bold', color: messenger.theirsInk },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 14,
    backgroundColor: messenger.field,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular', color: messenger.theirsInk },
  state: { padding: 24, alignItems: 'center' },
  stateText: { textAlign: 'center', color: messenger.chipInk, fontFamily: 'Inter_400Regular' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 10 },
  rowPressed: { backgroundColor: messenger.canvas },
  rowBody: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: messenger.theirsInk },
  rowGroup: { fontSize: 13, fontFamily: 'Inter_400Regular', color: messenger.chipInk },
});

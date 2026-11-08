/**
 * Các phần tử của một luồng chat: mốc ngày, bong bóng tin và dòng cuộc gọi.
 *
 * Chỉ trình bày; mọi quyết định hiện gì đã được `buildTimeline` đưa ra.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { UCIcon } from '../../../components/uc-icon';
import { messenger } from '../../../design/tokens';
import { MemberAvatar } from '../../account/components/member-avatar';
import { callIcon, callNeedsAttention, describeCall, formatClock, formatTalkTime } from '../call-log';

import type { CallHistoryEntry, ChatAttachment } from '../messages-api';
import type { MessageItem } from '../thread-timeline';

const AVATAR = 26;

/** Viên mốc ngày ở giữa luồng. */
export function DayChip({ label }: { readonly label: string }) {
  return (
    <View style={styles.dayRow}>
      <Text style={styles.dayChip}>{label}</Text>
    </View>
  );
}

/** Dòng chữ của một nhóm cuộc gọi liền nhau, kèm thời lượng nếu đã nói chuyện. */
export function callSummary(entries: readonly CallHistoryEntry[]): { label: string; detail: string } {
  const first = entries[0];
  const last = entries[entries.length - 1];
  const description = describeCall(first);
  const label = entries.length > 1 ? `${entries.length} ${description.toLowerCase()}` : description;
  const talked = entries.length === 1 && first.status === 'ENDED' && first.talkSeconds > 0;
  const clock = formatClock(last.startedAt);
  return { label, detail: talked ? `${formatTalkTime(first.talkSeconds)} · ${clock}` : clock };
}

/** Một cuộc gọi, hoặc vài cuộc liền nhau cùng kiểu, ở giữa luồng. */
export function CallLogPill({ entries }: { readonly entries: readonly CallHistoryEntry[] }) {
  const first = entries[0];
  const missed = callNeedsAttention(first);
  const answered = first.status === 'ENDED';
  const { label, detail } = callSummary(entries);
  const iconBg = missed ? messenger.missedIconBg : answered ? messenger.okIconBg : messenger.field;
  const iconInk = missed ? messenger.missedInk : answered ? messenger.okIcon : messenger.chipInk;

  return (
    <View style={styles.dayRow} testID="call-log-pill">
      <View style={[styles.callPill, missed && styles.callPillMissed]}>
        <View style={[styles.callIcon, { backgroundColor: iconBg }]}>
          <UCIcon name={callIcon(first)} size={14} color={iconInk} />
        </View>
        <Text style={[styles.callLabel, missed && styles.callLabelMissed]}>{label}</Text>
        <Text style={styles.callDetail}>{detail}</Text>
      </View>
    </View>
  );
}

function AttachmentLine({ attachment, mine }: { readonly attachment: ChatAttachment; readonly mine: boolean }) {
  const ink = mine ? messenger.mineInk : messenger.theirsInk;
  return (
    <View style={styles.attachment}>
      <UCIcon name={attachment.kind === 'IMAGE' ? 'image' : 'insert-drive-file'} size={16} color={ink} />
      <Text style={[styles.attachmentName, { color: ink }]} numberOfLines={1}>
        {attachment.originalName}
      </Text>
    </View>
  );
}

interface MessageRowProps {
  readonly item: MessageItem;
  /** Trong nhóm, tên người gửi hiện trên tin đầu của mỗi chuỗi. */
  readonly showSender: boolean;
}

/** Bong bóng tin: của mình bên phải màu nhấn, của người khác bên trái kèm avatar. */
export const MessageRow = React.memo(function MessageRow({ item, showSender }: MessageRowProps) {
  const { message } = item;
  const mine = message.mine;
  return (
    <View style={[styles.messageWrap, item.showAvatar && styles.runEnd]}>
      <View style={[styles.messageRow, mine && styles.messageRowMine]}>
        {!mine && (item.showAvatar
          ? <MemberAvatar name={message.senderName} size={AVATAR} />
          : <View style={styles.avatarSpacer} />)}
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
          {showSender && !mine && <Text style={styles.sender}>{message.senderName}</Text>}
          {message.body ? (
            <Text style={[styles.body, mine && styles.bodyMine]}>{message.body}</Text>
          ) : null}
          {message.attachments.map((attachment) => (
            <AttachmentLine key={attachment.id} attachment={attachment} mine={mine} />
          ))}
        </View>
      </View>
      {item.showSent && <Text style={styles.sent}>Đã gửi</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  dayRow: { alignItems: 'center', marginVertical: 10 },
  dayChip: {
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: messenger.chip,
    color: messenger.chipInk,
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  callPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 6,
    paddingRight: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: messenger.card,
    borderWidth: 1,
    borderColor: messenger.line,
  },
  callPillMissed: { borderColor: messenger.missedBorder },
  callIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  callLabel: { fontSize: 13, fontFamily: 'Inter_700Bold', color: messenger.theirsInk },
  callLabelMissed: { color: messenger.missedInk },
  callDetail: { fontSize: 13, fontFamily: 'Inter_400Regular', color: messenger.chipInk },
  messageWrap: { marginBottom: 4 },
  runEnd: { marginBottom: 12 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  messageRowMine: { justifyContent: 'flex-end' },
  avatarSpacer: { width: AVATAR },
  bubble: { maxWidth: '76%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, gap: 4 },
  bubbleMine: { backgroundColor: messenger.mine, borderBottomRightRadius: 6 },
  bubbleTheirs: {
    backgroundColor: messenger.theirs,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: messenger.line,
  },
  sender: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: messenger.chipInk },
  body: { fontSize: 15, lineHeight: 21, fontFamily: 'Inter_400Regular', color: messenger.theirsInk },
  bodyMine: { color: messenger.mineInk, fontFamily: 'Inter_500Medium' },
  attachment: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  attachmentName: { flexShrink: 1, fontSize: 13, fontFamily: 'Inter_500Medium', textDecorationLine: 'underline' },
  sent: {
    alignSelf: 'flex-end',
    marginTop: 4,
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: messenger.chipInk,
  },
});

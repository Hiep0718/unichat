import React from 'react';
import { StyleSheet, View } from 'react-native';

import { MemberAvatar } from '../../account/components/member-avatar';
import { messenger } from '../../../design/tokens';
import { othersOf } from '../conversation-presenter';

import type { Conversation } from '../messages-api';

interface ConversationAvatarProps {
  readonly conversation: Conversation;
  readonly size: number;
}

/**
 * Avatar của một cuộc trò chuyện.
 *
 * Tin nhắn riêng là chữ cái của người kia. Nhóm là hai avatar thành viên xếp
 * chéo nhau, để nhìn qua đã biết đây là nhiều người.
 */
export function ConversationAvatar({ conversation, size }: ConversationAvatarProps) {
  const others = othersOf(conversation);
  if (conversation.kind === 'DIRECT' || others.length < 2) {
    const name = others[0]?.name ?? conversation.title;
    return <MemberAvatar name={name} size={size} />;
  }

  const small = Math.round(size * 0.68);
  return (
    <View style={{ width: size, height: size }} testID="group-avatar">
      <MemberAvatar name={others[0].name} size={small} style={styles.back} />
      <MemberAvatar
        name={others[1].name}
        size={small}
        style={[styles.front, { borderRadius: small / 2 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  back: { position: 'absolute', top: 0, left: 0 },
  front: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: messenger.card,
  },
});

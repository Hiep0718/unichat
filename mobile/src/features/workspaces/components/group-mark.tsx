import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { defaultCoverFor } from '../default-covers';

interface GroupMarkProps {
  workspaceId: string;
  name: string;
  size?: number;
}

/**
 * A group's small square mark, used where there is no room for its cover.
 *
 * It carries the colour of that group's cover picture, so the group whose
 * card is violet is the violet tile in a list. The colour comes from the same
 * decision that chose the picture, which is what keeps the two agreeing.
 */
export function GroupMark({ workspaceId, name, size = 24 }: GroupMarkProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const { accent } = defaultCoverFor(workspaceId);

  return (
    <View
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          backgroundColor: accent,
          // Tracks the tile so the corner stays in proportion at any size.
          borderRadius: Math.max(6, Math.round(size * 0.3)),
        },
      ]}
    >
      <Text style={[styles.initial, { fontSize: Math.round(size * 0.46) }]}>
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
  },
});

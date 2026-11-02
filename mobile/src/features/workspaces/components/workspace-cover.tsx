import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { defaultCoverFor } from '../default-covers';
import { groupThemeFor } from '../group-theme';
import { topicCoverFor } from '../topic-covers';

interface WorkspaceCoverProps {
  workspaceId: string;
  name: string;
  /** What the group is about, which decides the picture when it is known. */
  topics?: readonly string[];
}

/**
 * The picture a group is seen by — a fill layer, not a band.
 *
 * It covers its whole container so the card's text sits on top of it rather
 * than beside it. Every group gets one of the bundled defaults, chosen so no
 * two groups in a list share one. That is a default and not a placeholder:
 * cards have to look distinct before anyone uploads anything, and in practice
 * most groups never will.
 *
 * The gradient stays underneath the picture. It paints with no decoding, so a
 * card is never a grey rectangle for a frame, and it is what remains if the
 * file cannot be read at all. Mobile previously stopped at that gradient,
 * which is why its cards carried no picture while the web's did.
 *
 * What the group is about wins over the hashed default where it is known, so
 * a card shows what the group holds rather than a colour it was dealt. Groups
 * sharing a topic share a picture, deliberately; the name and counts written
 * over it still tell them apart.
 */
export function WorkspaceCover({ workspaceId, name, topics }: WorkspaceCoverProps) {
  const [broken, setBroken] = useState(false);
  const { source } = topicCoverFor(topics) ?? defaultCoverFor(workspaceId);
  const theme = groupThemeFor(workspaceId);
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <View style={styles.cover}>
      <LinearGradient
        colors={[theme.from, theme.via, theme.to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {broken ? (
        // Nothing decoded: the initial becomes the texture the picture would
        // have been, bled off the edge so it reads as texture behind the
        // title rather than as a second label.
        <Text style={styles.mark}>{initial}</Text>
      ) : (
        <Image
          source={source}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setBroken(true)}
          accessibilityRole="image"
          accessibilityLabel=""
        />
      )}

      {/* Darkens the lower half, where the card writes its name and counts in
          white. Without it legibility would depend on which picture a group
          happens to have. */}
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.26)', 'rgba(0,0,0,0.58)']}
        locations={[0.38, 0.7, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  mark: {
    position: 'absolute',
    right: -14,
    top: -30,
    fontSize: 132,
    lineHeight: 132,
    letterSpacing: -5,
    color: 'rgba(255, 255, 255, 0.14)',
    fontFamily: 'Inter_700Bold',
  },
});

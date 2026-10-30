import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { OpaqueColorValue, StyleProp, StyleSheet, TextStyle } from 'react-native';
import { colors } from '../design/tokens';

export type IconName = keyof typeof MaterialIcons.glyphMap;

interface UCIconProps {
  name: IconName;
  size?: number;
  // Not RN's ColorValue: that widened to include null, which the icon set rejects.
  color?: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
}

/**
 * MaterialIcons wrapper component matching web's Google Material Symbols.
 */
export function UCIcon({
  name,
  size = 24,
  color = colors.onSurface,
  style,
}: UCIconProps) {
  // The icon set takes a single style object, not a StyleProp array, so callers
  // keep passing arrays and composed styles and they are flattened here.
  return <MaterialIcons name={name} size={size} color={color} style={StyleSheet.flatten(style)} />;
}

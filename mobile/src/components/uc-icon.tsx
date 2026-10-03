import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleProp, TextStyle, ColorValue } from 'react-native';
import { colors } from '../design/tokens';

export type IconName = keyof typeof MaterialIcons.glyphMap;

interface UCIconProps {
  name: IconName;
  size?: number;
  color?: ColorValue;
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
  return <MaterialIcons name={name} size={size} color={color} style={style} />;
}

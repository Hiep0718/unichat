import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors, radii, spacing } from '../design/tokens';
import { typography } from '../design/typography';
import { UCIcon, IconName } from './uc-icon';

interface UCTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  icon?: IconName;
  isPassword?: boolean;
}

export function UCTextInput({
  label,
  error,
  hint,
  icon,
  isPassword = false,
  style,
  ...rest
}: UCTextInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const hasError = !!error;

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.label, typography.labelSm]}>{label}</Text>
      ) : null}

      <View
        style={[
          styles.inputContainer,
          isFocused ? styles.focused : {},
          hasError ? styles.errorBorder : {},
        ]}
      >
        {icon ? (
          <UCIcon
            name={icon}
            size={20}
            color={hasError ? colors.error : isFocused ? colors.primary : colors.outline}
            style={styles.leadingIcon}
          />
        ) : null}

        <TextInput
          placeholderTextColor={colors.outline}
          style={[styles.input, typography.bodyMd, style]}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...rest}
        />

        {isPassword ? (
          <TouchableOpacity
            style={styles.trailingIcon}
            onPress={() => setShowPassword(!showPassword)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            <UCIcon
              name={showPassword ? 'visibility-off' : 'visibility'}
              size={20}
              color={colors.outline}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {hasError ? (
        <Text style={[styles.errorText, typography.bodySm]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.hintText, typography.bodySm]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.onSurface,
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: 1.2,
    borderColor: 'rgba(226, 232, 248, 0.9)',
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    minHeight: 50,
  },
  input: {
    flex: 1,
    color: colors.onSurface,
    paddingVertical: 13,
    fontSize: 15,
  },
  leadingIcon: {
    marginRight: spacing.sm,
  },
  trailingIcon: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  focused: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.primary,
    borderWidth: 1.5,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  errorBorder: {
    borderColor: colors.error,
    backgroundColor: 'rgba(255, 218, 214, 0.25)',
  },
  errorText: {
    color: colors.error,
    marginTop: 5,
    fontSize: 12,
    fontWeight: '500',
  },
  hintText: {
    color: colors.outline,
    marginTop: 5,
    fontSize: 12,
  },
});

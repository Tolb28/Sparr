import React from 'react';
import { Pressable, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Text } from '@/components/ui/text';
import { colors } from '@/src/theme/colors';

type Variant = 'primary' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface SparrButtonProps {
  onPress?: () => void;
  children?: React.ReactNode;
  label?: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}

const VARIANTS: Record<Variant, { bg: ViewStyle; text: TextStyle }> = {
  primary: {
    bg: { backgroundColor: colors.primary.main, borderWidth: 0 },
    text: { color: '#ffffff', fontWeight: '700' },
  },
  ghost: {
    bg: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border.medium },
    text: { color: colors.text.primary, fontWeight: '600' },
  },
  outline: {
    bg: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary.main },
    text: { color: colors.primary.main, fontWeight: '600' },
  },
  danger: {
    bg: { backgroundColor: colors.glass.redSurface, borderWidth: 1, borderColor: colors.glass.redBorder },
    text: { color: colors.error.main, fontWeight: '600' },
  },
};

const SIZES: Record<Size, { container: ViewStyle; text: TextStyle }> = {
  sm: { container: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 }, text: { fontSize: 13 } },
  md: { container: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 }, text: { fontSize: 15 } },
  lg: { container: { paddingVertical: 15, paddingHorizontal: 24, borderRadius: 14 }, text: { fontSize: 16 } },
};

export function SparrButton({
  onPress,
  children,
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  accessibilityLabel,
}: SparrButtonProps) {
  const v = VARIANTS[variant];
  const s = SIZES[size];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        v.bg,
        s.container,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : colors.primary.main} />
      ) : (
        <Text style={[v.text, s.text, textStyle]}>{label ?? children}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.76 },
});

export default SparrButton;

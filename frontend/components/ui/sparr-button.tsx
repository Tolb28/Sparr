import React from 'react';
import { Pressable, View, ActivityIndicator, StyleSheet, Text, ViewStyle, TextStyle } from 'react-native';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { actionHaptic, warningHaptic } from '@/src/utils/haptics';

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
  const c = useThemeColors();
  const VARIANTS: Record<Variant, { bg: ViewStyle; text: TextStyle }> = {
    primary: {
      bg: { backgroundColor: c.primary.main, borderWidth: 0 },
      text: { color: '#ffffff', fontWeight: '700' },
    },
    ghost: {
      bg: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.border.medium },
      text: { color: c.text.primary, fontWeight: '600' },
    },
    outline: {
      bg: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.primary.main },
      text: { color: c.primary.main, fontWeight: '600' },
    },
    danger: {
      bg: { backgroundColor: c.glass.redSurface, borderWidth: 1, borderColor: c.glass.redBorder },
      text: { color: c.error.main, fontWeight: '600' },
    },
  };
  const v = VARIANTS[variant];
  const s = SIZES[size];
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (variant === 'danger') {
      void warningHaptic();
    } else if (variant === 'primary') {
      void actionHaptic();
    }
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      <View style={[styles.base, v.bg, s.container]}>
        {loading ? (
          <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : c.primary.main} />
        ) : (
          <Text style={[v.text, s.text, textStyle]}>{label ?? children}</Text>
        )}
      </View>
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

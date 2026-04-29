import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { SparrButton } from '@/components/ui/sparr-button';
import { colors } from '@/src/theme/colors';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export function ErrorState({ message = 'Something went wrong.', onRetry, style }: ErrorStateProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconWrap}>
        <Ionicons name="alert-circle-outline" size={34} color={colors.error.main} />
      </View>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <SparrButton onPress={onRetry} variant="outline" size="sm" style={styles.btn}>
          Try Again
        </SparrButton>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.glass.redSurface,
    borderWidth: 1, borderColor: colors.glass.redBorder,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  message: { color: colors.text.secondary, fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  btn: { minWidth: 120 },
});

export default ErrorState;

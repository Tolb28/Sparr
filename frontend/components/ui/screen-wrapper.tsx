import React from 'react';
import { ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/src/theme/colors';

interface ScreenWrapperProps {
  children: React.ReactNode;
  scrollable?: boolean;
  padded?: boolean;
  style?: object;
  contentStyle?: object;
  keyboardAware?: boolean;
}

export function ScreenWrapper({
  children,
  scrollable = false,
  padded = true,
  style,
  contentStyle,
  keyboardAware = false,
}: ScreenWrapperProps) {
  const scrollContent = (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[padded && styles.paddedContent, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );

  const staticContent = (
    <SafeAreaView style={[styles.flex, padded && styles.padded, contentStyle]} edges={['bottom']}>
      {children}
    </SafeAreaView>
  );

  const inner = scrollable ? scrollContent : staticContent;

  const wrapped = keyboardAware ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {inner}
    </KeyboardAvoidingView>
  ) : inner;

  return (
    <SafeAreaView style={[styles.root, style]} edges={scrollable ? ['top'] : ['top', 'bottom']}>
      {wrapped}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  flex: { flex: 1 },
  padded: { paddingHorizontal: 16 },
  scroll: { flex: 1 },
  paddedContent: { paddingHorizontal: 16, paddingBottom: 32 },
});

export default ScreenWrapper;

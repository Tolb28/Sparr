import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { colorUtils } from '@/src/theme/colors';
import { useThemeColors } from '@/src/hooks/useThemeColors';

export interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  middleButtonText?: string;
  middleButtonDestructive?: boolean;
  onMiddleButton?: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationModal({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive = false,
  middleButtonText,
  middleButtonDestructive = false,
  onMiddleButton,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();

  return (
    <Modal
      visible={visible}
      transparent
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={[styles.card, { backgroundColor: c.background.card, borderColor: c.border.light, marginBottom: insets.bottom + 16 }]}
          onPress={(e) => e.stopPropagation()}
        >
          {destructive && <View style={[styles.dangerAccent, { backgroundColor: c.primary.main }]} />}

          <View style={styles.content}>
            <Text style={[styles.title, { color: c.text.primary }]}>{title}</Text>
            {message ? <Text style={[styles.message, { color: c.text.secondary }]}>{message}</Text> : null}
          </View>

          <View style={styles.buttonRow}>
            <Pressable style={[styles.cancelButton, { borderColor: c.border.light }]} onPress={onCancel}>
              <Text style={[styles.cancelText, { color: c.text.secondary }]}>{cancelText}</Text>
            </Pressable>
            {middleButtonText && onMiddleButton && (
              <Pressable
                style={[styles.confirmButton, { backgroundColor: c.background.tertiary }, middleButtonDestructive && { backgroundColor: colorUtils.hexToRgba(c.primary.main, 0.15), borderWidth: 1, borderColor: colorUtils.hexToRgba(c.primary.main, 0.4) }]}
                onPress={onMiddleButton}
              >
                <Text style={[styles.confirmText, { color: c.text.primary }, middleButtonDestructive && { color: c.primary.main }]}>
                  {middleButtonText}
                </Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.confirmButton, { backgroundColor: c.background.tertiary }, destructive && { backgroundColor: colorUtils.hexToRgba(c.primary.main, 0.15), borderWidth: 1, borderColor: colorUtils.hexToRgba(c.primary.main, 0.4) }]}
              onPress={onConfirm}
            >
              <Text style={[styles.confirmText, { color: c.text.primary }, destructive && { color: c.primary.main }]}>
                {confirmText}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dangerAccent: {
    height: 3,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Barlow_700Bold',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 4,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, View, ViewStyle } from 'react-native';
import { Motion, MotionComponentProps } from '@legendapp/motion';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { colors, colorUtils } from '@/src/theme/colors';

type NotificationType = 'badge' | 'success' | 'error';

interface NotificationPayload {
  id: string;
  type: NotificationType;
  title: string;
  subtitle?: string;
  message?: string;
  icon_name?: string;
  color?: string;
}

const listeners = new Set<(payload: NotificationPayload) => void>();

const emit = (payload: NotificationPayload) => {
  try {
    listeners.forEach((listener) => listener(payload));
  } catch {
    // Ignore listener failures to avoid breaking notification flow.
  }
};

export function showBadgeNotification(badge: {
  title: string;
  icon_name: string;
  color: string;
}): void {
  if (!badge?.title) return;
  emit({
    id: `badge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: 'badge',
    title: 'Badge Unlocked!',
    subtitle: badge.title,
    message: 'Keep it up!',
    icon_name: badge.icon_name,
    color: badge.color,
  });
}

export function showSuccessNotification(message: string): void {
  emit({
    id: `success-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: 'success',
    title: 'Success',
    subtitle: message,
    icon_name: 'checkmark-circle',
    color: colors.success.main,
  });
}

export function showErrorNotification(message: string): void {
  emit({
    id: `error-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: 'error',
    title: 'Something went wrong',
    subtitle: message,
    icon_name: 'alert-circle',
    color: colors.error.main,
  });
}

export function subscribeNotifications(listener: (payload: NotificationPayload) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

type MotionViewProps = React.ComponentProps<typeof View> &
  MotionComponentProps<typeof View, ViewStyle, unknown, unknown, unknown>;

const MotionView = Motion.View as React.ComponentType<MotionViewProps>;

const DISPLAY_DURATION_MS = 3500;
const EXIT_DURATION_MS = 200;

export const NotificationHost: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState<NotificationPayload | null>(null);
  const [visible, setVisible] = useState(false);
  const queueRef = useRef<NotificationPayload[]>([]);
  const activeRef = useRef<NotificationPayload | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clearTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showNext = useCallback((payload: NotificationPayload) => {
    activeRef.current = payload;
    setActive(payload);
    setVisible(true);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeNotifications((payload) => {
      if (activeRef.current) {
        queueRef.current.push(payload);
      } else {
        showNext(payload);
      }
    });
    return unsubscribe;
  }, [showNext]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    if (!active) return;
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setVisible(false);
    }, DISPLAY_DURATION_MS);
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [active]);

  useEffect(() => {
    if (visible || !active) return;
    if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);
    clearTimeoutRef.current = setTimeout(() => {
      setActive(null);
      activeRef.current = null;
      const next = queueRef.current.shift();
      if (next) {
        showNext(next);
      }
    }, EXIT_DURATION_MS);
    return () => {
      if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);
    };
  }, [active, showNext, visible]);

  const accentColor = active?.color || colors.primary.main;
  const iconColor = active?.type === 'error' ? colors.error.main : accentColor;
  const iconName =
    (active?.icon_name as any) || (active?.type === 'error' ? 'alert-circle' : 'ribbon-outline');

  return (
    <Modal
      visible={!!active}
      transparent
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      animationType="none"
    >
      <View
        pointerEvents="none"
        style={[styles.root, { paddingTop: insets.top + 12 }]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${active?.title}${active?.subtitle ? `, ${active.subtitle}` : ''}${active?.message ? `, ${active.message}` : ''}`}
        testID="NotificationHost_Toast"
      >
        {active && (
          <MotionView
            style={[
              styles.toast,
              {
                borderColor: colorUtils.hexToRgba(accentColor, 0.4),
                backgroundColor: colorUtils.hexToRgba(accentColor, 0.12),
              },
            ]}
            animate={{ opacity: visible ? 1 : 0, translateY: visible ? 0 : -20 }}
            transition={{ type: 'timing', duration: visible ? 200 : 200 }}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={iconName} size={28} color={iconColor} />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.title}>{active.title}</Text>
              {active.subtitle ? <Text style={styles.subtitle}>{active.subtitle}</Text> : null}
              {active.message ? <Text style={styles.message}>{active.message}</Text> : null}
            </View>
          </MotionView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 0,
    zIndex: 999,
    alignItems: 'center',
  },
  toast: {
    width: '100%',
    minHeight: 84,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.glass.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  subtitle: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  message: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: 2,
  },
});

export default NotificationHost;

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isSupported = Platform.OS === 'ios' || Platform.OS === 'android';

/** Light tap — for tab presses, toggles, minor interactions */
export async function tapHaptic(): Promise<void> {
  if (!isSupported) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}

/** Medium impact — for primary action buttons (save, create, confirm) */
export async function actionHaptic(): Promise<void> {
  if (!isSupported) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {}
}

/** Success notification — for completed actions */
export async function successHaptic(): Promise<void> {
  if (!isSupported) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {}
}

/** Error notification — for failed actions */
export async function errorHaptic(): Promise<void> {
  if (!isSupported) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {}
}

/** Warning — for destructive actions */
export async function warningHaptic(): Promise<void> {
  if (!isSupported) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {}
}

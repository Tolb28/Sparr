import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { GlassCard } from '@/components/ui/glass-card';
import { SparrButton } from '@/components/ui/sparr-button';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { resendVerificationEmail } from '@/src/api/emailVerification';
import { showSuccessNotification, showErrorNotification } from '@/src/services/notificationService';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'PendingVerification'>;

export default function PendingVerificationScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      await resendVerificationEmail(email);
      showSuccessNotification('Verification email sent');
    } catch (err: any) {
      showErrorNotification(err?.message || 'Could not resend email');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: c.background.secondary }]}>
      <View style={styles.glowTop} pointerEvents="none" />

      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: c.glass.redSurface, borderColor: c.glass.redBorder }]}>
          <Ionicons name="mail-outline" size={36} color={c.primary.main} />
        </View>

        <Text style={[styles.title, { color: c.text.primary }]}>Check your email</Text>
        <Text style={[styles.subtitle, { color: c.text.secondary }]}>
          We sent a verification link to
        </Text>
        <Text style={[styles.email, { color: c.text.primary }]}>{email}</Text>
        <Text style={[styles.instruction, { color: c.text.tertiary }]}>
          Click the link in the email to activate your account. Check your spam folder if you don't see it.
        </Text>

        <GlassCard variant="medium" radius={16} padding={20} style={styles.card}>
          <Text style={[styles.cardTitle, { color: c.text.primary }]}>Didn't receive the email?</Text>
          <Text style={[styles.cardBody, { color: c.text.tertiary }]}>
            Make sure you entered the right email address, or tap below to resend.
          </Text>
          <SparrButton
            onPress={handleResend}
            loading={resending}
            variant="outline"
            fullWidth
            size="md"
            style={{ marginTop: 12 }}
            accessibilityLabel="Resend verification email"
          >
            Resend Email
          </SparrButton>
        </GlassCard>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: c.text.tertiary }]}>Already verified? </Text>
          <SparrButton
            onPress={() => navigation.navigate('Login')}
            variant="ghost"
            size="sm"
            accessibilityLabel="Go to login"
          >
            Log In
          </SparrButton>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  glowTop: {
    position: 'absolute', top: -80, right: -80,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(242, 13, 13, 0.10)',
  },
  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 28,
  },
  iconWrap: {
    width: 80, height: 80, borderRadius: 24,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, textAlign: 'center' },
  email: { fontSize: 15, fontWeight: '700', textAlign: 'center', marginTop: 4, marginBottom: 12 },
  instruction: { fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  card: { width: '100%', marginBottom: 24 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  cardBody: { fontSize: 13, lineHeight: 20 },
  footer: { flexDirection: 'row', alignItems: 'center' },
  footerText: { fontSize: 14 },
});

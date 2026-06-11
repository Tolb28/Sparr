import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TextInput, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { register } from '../api/register';
import { storeToken } from '../api/tokenHandler';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/ui/glass-card';
import { SparrButton } from '@/components/ui/sparr-button';
import { useNavigation } from '@react-navigation/native';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { contentContainerStyle } from '@/src/utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const navAny = useNavigation<any>();
  const c = useThemeColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!email || !password) { setError('Please enter email and password'); return; }
    setLoading(true);
    try {
      const registerResp = await register(email, password);
      setError(null);
      if ('status' in registerResp && registerResp.status === 'email_verification_required') {
        navigation.replace('PendingVerification', { email: registerResp.email });
        return;
      }
      if (registerResp.token) {
        await storeToken(registerResp.token);
      }
      navigation.replace((registerResp as any)?.needsProfileSetup === false ? 'Main' : 'CreateProfile');
    } catch (err: any) {
      setError(err?.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: c.background.secondary }]}>
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.scroll, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={[styles.logoMark, { backgroundColor: c.glass.redSurface, borderColor: c.glass.redBorder }]}>
              <Ionicons name="fitness" size={28} color={c.primary.main} />
            </View>
            <Text style={[styles.wordmark, { color: c.text.primary }]}>SPARR</Text>
            <Text style={[styles.tagline, { color: c.text.tertiary }]}>Train. Fight. Connect.</Text>
          </View>

          <GlassCard style={styles.card} variant="medium" radius={20} padding={24}>
            <Text style={[styles.cardTitle, { color: c.text.primary }]}>Create your account</Text>
            <Text style={[styles.cardSub, { color: c.text.tertiary }]}>Username and profile are set up next.</Text>

            {error && (
              <View style={[styles.errorBox, { backgroundColor: c.glass.redSurface, borderColor: c.glass.redBorder }]}>
                <Ionicons name="alert-circle-outline" size={15} color={c.error.main} />
                <Text style={[styles.errorText, { color: c.error.light }]}>{error}</Text>
              </View>
            )}

            <View style={styles.field}>
              <Text style={[styles.label, { color: c.text.secondary }]}>Email</Text>
              <TextInput
                style={[styles.input, styles.inputText, { borderColor: c.input.border, backgroundColor: c.input.background, color: c.text.primary }]}
                placeholder="your@email.com"
                value={email}
                onChangeText={(t) => { setEmail(t); setError(null); }}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={c.input.placeholder}
              />
            </View>

            <View style={[styles.field, styles.fieldLast]}>
              <Text style={[styles.label, { color: c.text.secondary }]}>Password</Text>
              <TextInput
                style={[styles.input, styles.inputText, { borderColor: c.input.border, backgroundColor: c.input.background, color: c.text.primary }]}
                placeholder="Choose a strong password"
                value={password}
                onChangeText={(t) => { setPassword(t); setError(null); }}
                secureTextEntry
                placeholderTextColor={c.input.placeholder}
              />
            </View>

            <Pressable
              style={styles.termsRow}
              onPress={() => setTermsAccepted(v => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: termsAccepted }}
              accessibilityLabel="Accept Terms of Use and Privacy Policy"
            >
              <View style={[
                styles.checkbox,
                { borderColor: termsAccepted ? c.primary.main : c.border.medium, backgroundColor: termsAccepted ? c.primary.main : c.input.background },
              ]}>
                {termsAccepted && <Ionicons name="checkmark" size={13} color="#fff" />}
              </View>
              <Text style={[styles.termsText, { color: c.text.secondary }]}>
                I have read and agree to the{' '}
                <Text style={[styles.termsLink, { color: c.primary.main }]} onPress={() => navAny.navigate('TermsOfService')}>
                  Terms of Use
                </Text>
                {' '}and{' '}
                <Text style={[styles.termsLink, { color: c.primary.main }]} onPress={() => navAny.navigate('PrivacyPolicy')}>
                  Privacy Policy
                </Text>
              </Text>
            </Pressable>

            <SparrButton
              onPress={handleRegister}
              loading={loading}
              disabled={!termsAccepted}
              fullWidth
              size="lg"
              accessibilityLabel="Create account"
            >
              Create Account
            </SparrButton>
          </GlassCard>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: c.text.tertiary }]}>Already have an account? </Text>
            <Pressable onPress={() => navigation.navigate('Login')} accessibilityRole="link">
              <Text style={[styles.footerLink, { color: c.primary.main }]}>Log in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  glowTop: {
    position: 'absolute', top: -120, left: -100,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(242, 13, 13, 0.18)',
  },
  glowBottom: {
    position: 'absolute', bottom: 60, right: -100,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(242, 13, 13, 0.06)',
  },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  header: { alignItems: 'center', marginBottom: 36 },
  logoMark: {
    width: 60, height: 60, borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  wordmark: { fontSize: 42, fontWeight: '800', letterSpacing: 8, lineHeight: 52 },
  tagline: { fontSize: 13, letterSpacing: 2.5, marginTop: 4, textTransform: 'uppercase' },
  card: { width: '100%' },
  cardTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  cardSub: { fontSize: 13, marginBottom: 20 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16,
  },
  errorText: { fontSize: 13, flex: 1 },
  field: { marginBottom: 14 },
  fieldLast: { marginBottom: 24 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 7, letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 12, height: 48, paddingHorizontal: 14 },
  inputText: { fontSize: 15 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14, fontWeight: '700' },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16 },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, marginTop: 1,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {},
  termsText: { flex: 1, fontSize: 13, lineHeight: 20 },
  termsLink: { fontWeight: '600' },
});

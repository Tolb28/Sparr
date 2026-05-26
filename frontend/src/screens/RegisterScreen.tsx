import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TextInput, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { register } from '../api/register';
import { storeToken } from '../api/tokenHandler';
import { login } from '../api/login';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/ui/glass-card';
import { SparrButton } from '@/components/ui/sparr-button';
import { colors } from '@/src/theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!email || !password) { setError('Please enter email and password'); return; }
    setLoading(true);
    try {
      await register(email, password);
      setError(null);
      try {
        const loginResp = await login(email, password);
        if (loginResp?.token) await storeToken(loginResp.token);
      } catch {}
      navigation.replace('CreateProfile');
    } catch (err: any) {
      setError(err?.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoMark}>
              <Ionicons name="fitness" size={28} color={colors.primary.main} />
            </View>
            <Text style={styles.wordmark}>SPARR</Text>
            <Text style={styles.tagline}>Train. Fight. Connect.</Text>
          </View>

          <GlassCard style={styles.card} variant="medium" radius={20} padding={24}>
            <Text style={styles.cardTitle}>Create your account</Text>
            <Text style={styles.cardSub}>Username and profile are set up next.</Text>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={15} color={colors.error.main} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, styles.inputText]}
                placeholder="your@email.com"
                value={email}
                onChangeText={(t) => { setEmail(t); setError(null); }}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.input.placeholder}
              />
            </View>

            <View style={[styles.field, styles.fieldLast]}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[styles.input, styles.inputText]}
                placeholder="Choose a strong password"
                value={password}
                onChangeText={(t) => { setPassword(t); setError(null); }}
                secureTextEntry
                placeholderTextColor={colors.input.placeholder}
              />
            </View>

            <SparrButton
              onPress={handleRegister}
              loading={loading}
              fullWidth
              size="lg"
              accessibilityLabel="Create account"
            >
              Create Account
            </SparrButton>
          </GlassCard>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={() => navigation.navigate('Login')} accessibilityRole="link">
              <Text style={styles.footerLink}>Log in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.secondary },
  flex: { flex: 1 },
  glowTop: {
    position: 'absolute', top: -120, left: -100,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: colors.gradient.accentGlow,
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
    backgroundColor: colors.glass.redSurface,
    borderWidth: 1, borderColor: colors.glass.redBorder,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  wordmark: { fontSize: 42, fontWeight: '800', color: colors.text.primary, letterSpacing: 8, lineHeight: 52 },
  tagline: { fontSize: 13, color: colors.text.tertiary, letterSpacing: 2.5, marginTop: 4, textTransform: 'uppercase' },
  card: { width: '100%' },
  cardTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary, marginBottom: 4 },
  cardSub: { fontSize: 13, color: colors.text.tertiary, marginBottom: 20 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.glass.redSurface, borderWidth: 1, borderColor: colors.glass.redBorder,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16,
  },
  errorText: { color: colors.error.light, fontSize: 13, flex: 1 },
  field: { marginBottom: 14 },
  fieldLast: { marginBottom: 24 },
  label: { fontSize: 12, fontWeight: '600', color: colors.text.secondary, marginBottom: 7, letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: colors.input.border, backgroundColor: colors.input.background, borderRadius: 12, height: 48, paddingHorizontal: 14 },
  inputText: { color: colors.text.primary, fontSize: 15 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  footerText: { color: colors.text.tertiary, fontSize: 14 },
  footerLink: { color: colors.primary.main, fontSize: 14, fontWeight: '700' },
});

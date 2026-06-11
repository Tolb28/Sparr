import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  Pressable,
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { login, loginWithGoogle, resolveGoogleConflictDecision } from '../api/login';
import { getToken, storeToken } from '../api/tokenHandler';
import { getUserProfile } from '../api/profile';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { getProfile } from '../api/profileHandler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/ui/glass-card';
import { SparrButton } from '@/components/ui/sparr-button';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import ConfirmationModal from '@/src/components/ConfirmationModal';
import { contentContainerStyle } from '@/src/utils/responsive';

WebBrowser.maybeCompleteAuthSession();

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [googleRequest, setGoogleRequest] = useState<any>(null);
  const [googleResponse, setGoogleResponse] = useState<any>(null);
  const [promptGoogle, setPromptGoogle] = useState<((opts?: any) => Promise<any>) | null>(null);
  const [ownershipResolve, setOwnershipResolve] = useState<((val: 'mine' | 'not_mine' | null) => void) | null>(null);

  // Only mount Google auth provider when a client id exists for the current platform
  const googleConfigured =
    (Platform.OS === 'android' && !!process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID) ||
    (Platform.OS === 'ios' && !!process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) ||
    (Platform.OS === 'web' && !!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);

  function GoogleAuthProvider({ onInit }: { onInit: (r: any, res: any, p: any) => void }) {
    const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });

    useEffect(() => {
      onInit(request, response, promptAsync);
    }, [request, response, promptAsync, onInit]);

    return null;
  }

  const routeAfterAuth = async () => {
    try {
      const profileResp = await getUserProfile();
      navigation.replace(profileResp?.profile ? 'Main' : 'CreateProfile');
    } catch {
      navigation.replace('CreateProfile');
    }
  };

  const askOwnershipDecision = () =>
    new Promise<'mine' | 'not_mine' | null>((resolve) => {
      setOwnershipResolve(() => resolve);
    });

  const handleGoogleLogin = async (idToken: string) => {
    setGoogleLoading(true);
    setError(null);

    try {
      const resp = await loginWithGoogle(idToken);
      await storeToken(resp.token);
      await routeAfterAuth();
      return;
    } catch (err: any) {
      if (err?.code === 'EMAIL_CONFLICT' && err?.data?.token && err?.data?.conflictUserId) {
        const decision = await askOwnershipDecision();
        if (!decision) {
          setGoogleLoading(false);
          return;
        }

        const conflictUserId = String(err.data.conflictUserId);
        await resolveGoogleConflictDecision(err.data.token, decision, conflictUserId);
        await storeToken(err.data.token);
        await routeAfterAuth();
        return;
      }

      setError(err?.message ?? 'Google login failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (googleResponse?.type !== 'success') return;
    const idToken = googleResponse.params?.id_token || googleResponse.authentication?.idToken;
    if (!idToken) {
      setError('Google authentication did not return an ID token.');
      return;
    }
    void handleGoogleLogin(idToken);
  }, [googleResponse]);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const profile = await getProfile();
      if (token && profile) {
        navigation.replace('Main');
      }
    })();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const resp = await login(email, password);
      setError(null);
      await storeToken(resp.token);
      await routeAfterAuth();
    } catch (err: any) {
      setError(err?.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGooglePress = async () => {
    if (!promptGoogle) {
      setError('Google login is not configured. Add Google client IDs in Expo env.');
      return;
    }
    setError(null);
    await promptGoogle();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: c.background.secondary }]}>
      {googleConfigured && (
        <GoogleAuthProvider
          onInit={(r, res, p) => {
            setGoogleRequest(r);
            setGoogleResponse(res);
            setPromptGoogle(() => p);
          }}
        />
      )}
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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
            <Text style={[styles.cardTitle, { color: c.text.primary }]}>Welcome back</Text>

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
                onChangeText={(t) => {
                  setEmail(t);
                  setError(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={c.input.placeholder}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            <View style={[styles.field, styles.fieldLast]}>
              <Text style={[styles.label, { color: c.text.secondary }]}>Password</Text>
              <View style={[styles.passwordWrap, { borderColor: c.input.border, backgroundColor: c.input.background }]}>
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, styles.inputText, { flex: 1, borderWidth: 0, color: c.text.primary, backgroundColor: 'transparent' }]}
                  placeholder="********"
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setError(null);
                  }}
                  secureTextEntry={!showPassword}
                  placeholderTextColor={c.input.placeholder}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeSlot}>
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={18}
                    color={c.text.secondary}
                  />
                </Pressable>
              </View>
            </View>

            <SparrButton
              onPress={handleLogin}
              loading={loading}
              fullWidth
              size="lg"
              style={styles.loginBtn}
              accessibilityLabel="Log in"
            >
              Log In
            </SparrButton>

            <View style={styles.dividerWrap}>
              <View style={[styles.divider, { backgroundColor: c.border.light }]} />
              <Text style={[styles.dividerText, { color: c.text.tertiary }]}>or</Text>
              <View style={[styles.divider, { backgroundColor: c.border.light }]} />
            </View>

            <SparrButton
              onPress={handleGooglePress}
              loading={googleLoading}
              fullWidth
              size="lg"
              variant="ghost"
              style={styles.googleBtn}
              accessibilityLabel="Continue with Google"
            >
              Continue with Google
            </SparrButton>
          </GlassCard>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: c.text.tertiary }]}>New to Sparr? </Text>
            <Pressable onPress={() => navigation.navigate('Register')} accessibilityRole="link">
              <Text style={[styles.footerLink, { color: c.primary.main }]}>Create an account</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <ConfirmationModal
        visible={!!ownershipResolve}
        title="Account ownership check"
        message="We found an account with the same email. Is it your account?"
        cancelText="Cancel"
        middleButtonText="No"
        middleButtonDestructive
        confirmText="Yes"
        onCancel={() => { ownershipResolve?.(null); setOwnershipResolve(null); }}
        onMiddleButton={() => { ownershipResolve?.('not_mine'); setOwnershipResolve(null); }}
        onConfirm={() => { ownershipResolve?.('mine'); setOwnershipResolve(null); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  glowTop: {
    position: 'absolute', top: -120, right: -100,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(242, 13, 13, 0.18)',
  },
  glowBottom: {
    position: 'absolute', bottom: 60, left: -100,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(242, 13, 13, 0.06)',
  },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  header: { alignItems: 'center', marginBottom: 36 },
  logoMark: { width: 60, height: 60, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  wordmark: { fontSize: 42, fontWeight: '800', letterSpacing: 8, lineHeight: 52 },
  tagline: { fontSize: 13, letterSpacing: 2.5, marginTop: 4, textTransform: 'uppercase' },
  card: { width: '100%' },
  cardTitle: { fontSize: 20, fontWeight: '700', marginBottom: 20 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16 },
  errorText: { fontSize: 13, flex: 1 },
  field: { marginBottom: 14 },
  fieldLast: { marginBottom: 24 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 7, letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 12, height: 48, paddingHorizontal: 14 },
  inputText: { fontSize: 15 },
  passwordWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, height: 48, paddingLeft: 14 },
  eyeSlot: { paddingRight: 14 },
  loginBtn: { marginTop: 0 },
  dividerWrap: { flexDirection: 'row', alignItems: 'center', marginVertical: 14, gap: 10 },
  divider: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  googleBtn: { marginTop: 0 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14, fontWeight: '700' },
});


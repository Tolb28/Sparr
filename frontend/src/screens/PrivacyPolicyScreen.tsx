import React from 'react';
import { ScrollView, View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/src/hooks/useThemeColors';

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const c = useThemeColors();

  return (
    <View style={[styles.root, { backgroundColor: c.background.secondary }]}>
      <View style={[styles.header, { paddingTop: (insets.top || 0) + 4, borderBottomColor: c.border.light }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.iconBtn, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={20} color={c.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text.primary }]}>Privacy Policy</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.lastUpdated, { color: c.text.tertiary }]}>Last updated: January 1, 2025</Text>

        <Section title="1. Information We Collect">
          We collect information you provide directly:{'\n'}
          • Account information (email address, password){'\n'}
          • Profile information (display name, username, bio, avatar photo){'\n'}
          • Training data (sessions, drills, techniques you log){'\n'}
          • Content you post (photos, videos, comments){'\n'}
          • Messages you send through the App{'\n\n'}
          We automatically collect:{'\n'}
          • Device information (device type, operating system){'\n'}
          • Usage data (features used, time spent in App){'\n'}
          • Log data (IP address, access times, pages viewed)
        </Section>

        <Section title="2. How We Use Your Information">
          We use your information to:{'\n'}
          • Provide and improve the Sparr service{'\n'}
          • Personalize your experience and content recommendations{'\n'}
          • Enable social features (profiles, friends, clubs){'\n'}
          • Send service-related notifications{'\n'}
          • Ensure safety and prevent abuse{'\n'}
          • Comply with legal obligations
        </Section>

        <Section title="3. Information Sharing">
          We do not sell your personal information. We may share information:{'\n'}
          • With other users as part of the App's social features (profile, posts){'\n'}
          • With service providers who help us operate the App (cloud hosting, analytics){'\n'}
          • When required by law or to protect rights and safety{'\n'}
          • In connection with a merger or acquisition (you will be notified)
        </Section>

        <Section title="4. Data Storage & Security">
          Your data is stored securely using industry-standard encryption. We use Supabase for
          authentication and PostgreSQL for data storage, both with strong security practices.
          However, no method of transmission over the internet is 100% secure.
        </Section>

        <Section title="5. Your Rights">
          You have the right to:{'\n'}
          • Access the personal data we hold about you{'\n'}
          • Correct inaccurate data{'\n'}
          • Delete your account and associated data{'\n'}
          • Export your data{'\n'}
          • Opt out of non-essential communications{'\n\n'}
          To exercise these rights, contact us at privacy@sparr.app or use the account deletion
          option in Settings.
        </Section>

        <Section title="6. Data Retention">
          We retain your data for as long as your account is active. When you delete your account,
          we will delete your personal data within 30 days, except where we are required to retain it
          by law.
        </Section>

        <Section title="7. Children's Privacy">
          The App is not intended for children under 13. We do not knowingly collect personal
          information from children under 13. If we learn we have collected such information, we will
          delete it promptly.
        </Section>

        <Section title="8. Cookies & Tracking">
          The App may use analytics tools to understand usage patterns. On the web version, we use
          cookies for authentication and preferences. You can control cookies through your browser
          settings.
        </Section>

        <Section title="9. Third-Party Services">
          The App integrates with Google for sign-in and Cloudinary for media storage. These services
          have their own privacy policies. We encourage you to review them.
        </Section>

        <Section title="10. Changes to This Policy">
          We may update this Privacy Policy from time to time. We will notify you of significant
          changes through the App or by email. Continued use after changes constitutes acceptance.
        </Section>

        <Section title="11. Contact">
          If you have questions about this Privacy Policy or how we handle your data, contact us at
          privacy@sparr.app.
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useThemeColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: c.text.primary }]}>{title}</Text>
      <Text style={[styles.sectionBody, { color: c.text.secondary }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  lastUpdated: { fontSize: 12, marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  sectionBody: { fontSize: 14, lineHeight: 22 },
});

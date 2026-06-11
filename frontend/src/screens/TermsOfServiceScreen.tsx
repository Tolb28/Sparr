import React from 'react';
import { ScrollView, View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/src/hooks/useThemeColors';

export default function TermsOfServiceScreen() {
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
        <Text style={[styles.headerTitle, { color: c.text.primary }]}>Terms of Use</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.lastUpdated, { color: c.text.tertiary }]}>Last updated: January 1, 2025</Text>

        <Section title="1. Acceptance of Terms">
          By downloading, installing, or using the Sparr application ("App"), you agree to be bound by
          these Terms of Use. If you do not agree to these terms, do not use the App.
        </Section>

        <Section title="2. Description of Service">
          Sparr is a boxing training and social platform that allows users to track training sessions,
          discover techniques, connect with other athletes, and join clubs. We reserve the right to
          modify or discontinue the service at any time.
        </Section>

        <Section title="3. User Accounts">
          You must create an account to use most features of the App. You are responsible for
          maintaining the confidentiality of your account credentials and for all activities that occur
          under your account. You must be at least 13 years old to create an account.
        </Section>

        <Section title="4. User Content">
          You retain ownership of content you submit to the App (photos, posts, training data). By
          submitting content, you grant Sparr a non-exclusive, worldwide, royalty-free license to use,
          display, and distribute that content within the App. You must not post content that is
          illegal, harmful, or infringes on others' rights.
        </Section>

        <Section title="5. Prohibited Conduct">
          You agree not to:{'\n'}
          • Harass, bully, or threaten other users{'\n'}
          • Post false or misleading information{'\n'}
          • Attempt to gain unauthorized access to the App or its systems{'\n'}
          • Use the App for any illegal purpose{'\n'}
          • Reverse engineer or copy the App
        </Section>

        <Section title="6. Health & Safety Disclaimer">
          Sparr is a training companion, not a substitute for professional coaching or medical advice.
          Boxing and martial arts carry inherent risks of injury. Always train under qualified
          supervision and consult a healthcare professional before starting any new training regimen.
          Sparr is not liable for any injuries sustained during training.
        </Section>

        <Section title="7. Privacy">
          Your use of the App is also governed by our Privacy Policy, which is incorporated into these
          Terms by reference. Please review our Privacy Policy to understand our data practices.
        </Section>

        <Section title="8. Termination">
          We may suspend or terminate your account at any time if you violate these Terms. You may
          delete your account at any time through the App settings.
        </Section>

        <Section title="9. Limitation of Liability">
          To the maximum extent permitted by law, Sparr shall not be liable for any indirect,
          incidental, special, or consequential damages arising from your use of the App.
        </Section>

        <Section title="10. Changes to Terms">
          We may update these Terms from time to time. Continued use of the App after changes
          constitutes acceptance of the updated Terms. We will notify you of significant changes
          through the App.
        </Section>

        <Section title="11. Contact">
          If you have questions about these Terms, please contact us at legal@sparr.app.
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

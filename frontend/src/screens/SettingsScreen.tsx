import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, View, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { getMyProfiles, getUserProfile } from '../api/profile';
import { getActiveProfileId, setActiveProfileId, storeProfile, removeProfile } from '../api/profileHandler';
import { GlassCard } from '@/components/ui/glass-card';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { contentContainerStyle } from '@/src/utils/responsive';
import { showSuccessNotification, showErrorNotification } from '@/src/services/notificationService';
import ConfirmationModal from '@/src/components/ConfirmationModal';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const c = useThemeColors();

  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeProfileId, setActiveProfileIdState] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [linkedProfiles, activeId] = await Promise.all([getMyProfiles(), getActiveProfileId()]);
      setProfiles(linkedProfiles || []);
      setActiveProfileIdState(activeId || (linkedProfiles?.[0]?.id_profiles ?? null));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const selectProfile = async (profile: any) => {
    try {
      setSaving(true);
      await setActiveProfileId(Number(profile.id_profiles));
      setActiveProfileIdState(Number(profile.id_profiles));
      await storeProfile(profile);
      await getUserProfile();
      showSuccessNotification(`Now using ${profile.display_name || profile.username || 'selected profile'}`);
    } catch (error: any) {
      showErrorNotification(error?.message || 'Unable to switch profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: c.background.secondary }]}>
        <ActivityIndicator size="large" color={c.primary.main} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background.secondary }]}>
      <ScrollView contentContainerStyle={[{ paddingBottom: 100 }, contentContainerStyle]}>
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
          <Text style={[styles.headerTitle, { color: c.text.primary }]}>Settings</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.body}>
          <Text style={[styles.sectionTitle, { color: c.text.primary }]}>Switch Profile</Text>
          <Text style={[styles.sectionSub, { color: c.text.tertiary }]}>Switch between athlete profiles linked to your account.</Text>

          {(profiles || []).map((profile: any) => {
            const selected = Number(profile.id_profiles) === Number(activeProfileId);
            return (
              <Pressable
                key={String(profile.id_profiles)}
                disabled={saving}
                onPress={() => selectProfile(profile)}
                style={[
                  styles.profileCard,
                  { borderColor: selected ? c.primary.main : c.border.light, backgroundColor: selected ? c.glass.redSurface : c.background.card },
                ]}
              >
                <View style={styles.profileCardContent}>
                  <View>
                    <Text style={[styles.profileName, { color: c.text.primary }]}>{profile.display_name || profile.username || `Profile ${profile.id_profiles}`}</Text>
                    {!!profile.username && <Text style={[styles.profileUsername, { color: c.text.tertiary }]}>@{profile.username}</Text>}
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={22} color={c.primary.main} />}
                </View>
              </Pressable>
            );
          })}

          <GlassCard variant="default" radius={12} padding={0} style={styles.actionGroup}>
            <Pressable
              disabled={saving}
              onPress={() => navigation.navigate('EditProfile')}
              style={[styles.actionItem, styles.actionBorder, { borderBottomColor: c.border.light }]}
            >
              <Ionicons name="create-outline" size={18} color={c.text.secondary} />
              <Text style={[styles.actionText, { color: c.text.primary }]}>Edit Athlete Profile</Text>
              <Ionicons name="chevron-forward" size={16} color={c.text.tertiary} />
            </Pressable>
            <Pressable
              disabled={saving}
              onPress={() => navigation.navigate('CreateProfile')}
              style={styles.actionItem}
            >
              <Ionicons name="person-add-outline" size={18} color={c.text.secondary} />
              <Text style={[styles.actionText, { color: c.text.primary }]}>Create New Athlete Profile</Text>
              <Ionicons name="chevron-forward" size={16} color={c.text.tertiary} />
            </Pressable>
          </GlassCard>

          <Text style={[styles.sectionTitle, { marginTop: 6, color: c.text.primary }]}>Club Profile</Text>
          <Text style={[styles.sectionSub, { color: c.text.tertiary }]}>
            Create a club profile here. Manage club members and settings inside each club page.
          </Text>
          <GlassCard variant="default" radius={12} padding={0} style={styles.actionGroup}>
            <Pressable
              disabled={saving}
              onPress={() => navigation.navigate('CreateClubStepOne')}
              style={styles.actionItem}
            >
              <Ionicons name="business-outline" size={18} color={c.text.secondary} />
              <Text style={[styles.actionText, { color: c.text.primary }]}>Create New Club Profile</Text>
              <Ionicons name="chevron-forward" size={16} color={c.text.tertiary} />
            </Pressable>
          </GlassCard>

          <Text style={[styles.sectionTitle, { marginTop: 6, color: c.text.primary }]}>Legal</Text>
          <GlassCard variant="default" radius={12} padding={0} style={styles.actionGroup}>
            <Pressable
              onPress={() => navigation.navigate('TermsOfService')}
              style={[styles.actionItem, styles.actionBorder, { borderBottomColor: c.border.light }]}
              accessibilityRole="button"
            >
              <Ionicons name="document-text-outline" size={18} color={c.text.secondary} />
              <Text style={[styles.actionText, { color: c.text.primary }]}>Terms of Use</Text>
              <Ionicons name="chevron-forward" size={16} color={c.text.tertiary} />
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('PrivacyPolicy')}
              style={styles.actionItem}
              accessibilityRole="button"
            >
              <Ionicons name="shield-checkmark-outline" size={18} color={c.text.secondary} />
              <Text style={[styles.actionText, { color: c.text.primary }]}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={16} color={c.text.tertiary} />
            </Pressable>
          </GlassCard>

          <GlassCard variant="red" radius={12} padding={0} style={styles.dangerGroup}>
            <Pressable
              style={styles.actionItem}
              onPress={() => setConfirmLogout(true)}
            >
              <Ionicons name="log-out-outline" size={18} color={c.primary.main} />
              <Text style={[styles.actionText, { color: c.primary.main }]}>Log Out</Text>
            </Pressable>
          </GlassCard>
        </View>
      </ScrollView>
      <ConfirmationModal
        visible={confirmLogout}
        title="Log out"
        message="Are you sure you want to log out?"
        confirmText="Log out"
        destructive
        onConfirm={async () => { setConfirmLogout(false); await removeProfile(); navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] }); }}
        onCancel={() => setConfirmLogout(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
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
  body: { paddingHorizontal: 16, paddingTop: 20, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  sectionSub: { fontSize: 12, marginBottom: 8 },
  profileCard: { borderRadius: 12, borderWidth: 1 },
  profileCardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  profileName: { fontWeight: '700', fontSize: 14 },
  profileUsername: { fontSize: 12, marginTop: 2 },
  actionGroup: { overflow: 'hidden' },
  dangerGroup: { overflow: 'hidden', marginTop: 8 },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  actionBorder: { borderBottomWidth: 1 },
  actionText: { flex: 1, fontSize: 14 },
});

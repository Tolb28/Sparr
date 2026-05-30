import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { getMyProfiles, getUserProfile } from '../api/profile';
import { getActiveProfileId, setActiveProfileId, storeProfile, removeProfile } from '../api/profileHandler';
import { GlassCard } from '@/components/ui/glass-card';
import { colors } from '@/src/theme/colors';
import { showSuccessNotification, showErrorNotification } from '@/src/services/notificationService';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeProfileId, setActiveProfileIdState] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={[styles.header, { paddingTop: (insets.top || 0) + 4 }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.body}>
          <Text style={styles.sectionTitle}>Switch Profile</Text>
          <Text style={styles.sectionSub}>Switch between athlete profiles linked to your account.</Text>

          {(profiles || []).map((profile: any) => {
            const selected = Number(profile.id_profiles) === Number(activeProfileId);
            return (
              <Pressable
                key={String(profile.id_profiles)}
                disabled={saving}
                onPress={() => selectProfile(profile)}
                style={[styles.profileCard, selected && styles.profileCardActive]}
              >
                <View style={styles.profileCardContent}>
                  <View>
                    <Text style={styles.profileName}>{profile.display_name || profile.username || `Profile ${profile.id_profiles}`}</Text>
                    {!!profile.username && <Text style={styles.profileUsername}>@{profile.username}</Text>}
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={22} color={colors.primary.main} />}
                </View>
              </Pressable>
            );
          })}

          <GlassCard variant="default" radius={12} padding={0} style={styles.actionGroup}>
            <Pressable
              disabled={saving}
              onPress={() => navigation.navigate('EditProfile')}
              style={[styles.actionItem, styles.actionBorder]}
            >
              <Ionicons name="create-outline" size={18} color={colors.text.secondary} />
              <Text style={styles.actionText}>Edit Athlete Profile</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
            </Pressable>
            <Pressable
              disabled={saving}
              onPress={() => navigation.navigate('CreateProfile')}
              style={[styles.actionItem, styles.actionBorder]}
            >
              <Ionicons name="person-add-outline" size={18} color={colors.text.secondary} />
              <Text style={styles.actionText}>Create New Athlete Profile</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
            </Pressable>
          </GlassCard>

          <Text style={[styles.sectionTitle, { marginTop: 6 }]}>Club Profile</Text>
          <Text style={styles.sectionSub}>
            Create a club profile here. Manage club members and settings inside each club page.
          </Text>
          <GlassCard variant="default" radius={12} padding={0} style={styles.actionGroup}>
            <Pressable
              disabled={saving}
              onPress={() => navigation.navigate('CreateClubStepOne')}
              style={styles.actionItem}
            >
              <Ionicons name="business-outline" size={18} color={colors.text.secondary} />
              <Text style={styles.actionText}>Create New Club Profile</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
            </Pressable>
          </GlassCard>

          <GlassCard variant="red" radius={12} padding={0} style={styles.dangerGroup}>
            <Pressable
              style={styles.actionItem}
              onPress={() => {
                Alert.alert('Log out', 'Are you sure you want to log out?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Log out', style: 'destructive', onPress: async () => { await removeProfile(); navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] }); } },
                ]);
              }}
            >
              <Ionicons name="log-out-outline" size={18} color={colors.primary.main} />
              <Text style={[styles.actionText, { color: colors.primary.main }]}>Log Out</Text>
            </Pressable>
          </GlassCard>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.secondary },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border.light,
  },
  headerTitle: { color: colors.text.primary, fontSize: 16, fontWeight: '700' },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.glass.surface, borderWidth: 1, borderColor: colors.glass.border,
    alignItems: 'center', justifyContent: 'center',
  },
  body: { paddingHorizontal: 16, paddingTop: 20, gap: 12 },
  sectionTitle: { color: colors.text.primary, fontSize: 16, fontWeight: '800', marginBottom: 2 },
  sectionSub: { color: colors.text.tertiary, fontSize: 12, marginBottom: 8 },
  profileCard: {
    borderRadius: 12, borderWidth: 1, borderColor: colors.border.light,
    backgroundColor: colors.background.card,
  },
  profileCardActive: { borderColor: colors.primary.main, backgroundColor: colors.glass.redSurface },
  profileCardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  profileName: { color: colors.text.primary, fontWeight: '700', fontSize: 14 },
  profileUsername: { color: colors.text.tertiary, fontSize: 12, marginTop: 2 },
  actionGroup: { overflow: 'hidden' },
  dangerGroup: { overflow: 'hidden', marginTop: 8 },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  actionBorder: { borderBottomWidth: 1, borderBottomColor: colors.border.light },
  actionText: { flex: 1, color: colors.text.primary, fontSize: 14 },
});

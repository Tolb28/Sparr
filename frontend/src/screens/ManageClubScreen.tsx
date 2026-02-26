import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { GlassCard } from '@/components/ui/glass-card';
import { SparrButton } from '@/components/ui/sparr-button';
import { EmptyState } from '@/components/ui/empty-state';
import { RootStackParamList } from '../navigation/AppNavigator';
import {
  getClub,
  getClubMembers,
  getClubTrainingPlans,
  listJoinRequests,
  removeMember,
  reviewJoinRequest,
  updateClub,
  updateMemberRole,
  uploadClubAvatar,
  uploadClubCover,
} from '../api/clubs';
import { colors } from '@/src/theme/colors';

type RouteType = RouteProp<RootStackParamList, 'ManageClub'>;
const TABS = ['Overview', 'Members', 'Schedule', 'Settings'] as const;
type Tab = typeof TABS[number];

const ROLE_COLORS: Record<string, string> = {
  owner:  '#f5c518',
  admin:  colors.primary.main,
  coach:  '#06b6d4',
  member: colors.text.tertiary,
};

const ROLE_OPTIONS = ['owner', 'admin', 'coach', 'member'] as const;

export default function ManageClubScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteType>();
  const { clubId } = route.params;

  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [club, setClub]           = useState<any | null>(null);
  const [requests, setRequests]   = useState<any[]>([]);
  const [members, setMembers]     = useState<any[]>([]);
  const [plans, setPlans]         = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  // Settings form
  const [title, setTitle]         = useState('');
  const [location, setLocation]   = useState('');
  const [bio, setBio]             = useState('');
  const [instagram, setInstagram] = useState('');
  const [website, setWebsite]     = useState('');
  const [joinPolicy, setJoinPolicy] = useState<'open' | 'approval'>('open');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [clubData, pending, mems, plansData] = await Promise.all([
        getClub(clubId),
        listJoinRequests(clubId).catch(() => []),
        getClubMembers(clubId).catch(() => []),
        getClubTrainingPlans(clubId).catch(() => []),
      ]);
      setClub(clubData);
      setRequests(pending ?? []);
      setMembers(mems ?? []);
      setPlans(plansData ?? []);
      setTitle(clubData?.title ?? '');
      setLocation(clubData?.location ?? '');
      setBio(clubData?.bio ?? '');
      setInstagram(clubData?.instagram_url ?? '');
      setWebsite(clubData?.website_url ?? '');
      setJoinPolicy((clubData?.join_policy ?? 'open') === 'approval' ? 'approval' : 'open');
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => { load(); }, [load]);

  const pickAndUpload = async (type: 'avatar' | 'cover') => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission required', 'Allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'avatar' ? [1, 1] : [16, 9],
      quality: 0.85,
    });
    if (result.canceled) return;
    try {
      setSaving(true);
      const asset = result.assets[0];
      const fd = new FormData();
      fd.append(type, { uri: asset.uri, name: `club-${type}.jpg`, type: asset.mimeType ?? 'image/jpeg' } as any);
      if (type === 'avatar') await uploadClubAvatar(clubId, fd);
      else await uploadClubCover(clubId, fd);
      Alert.alert('Updated', `Club ${type} updated.`);
      await load();
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? 'Unable to upload');
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await updateClub(clubId, {
        title: title.trim() || undefined,
        location: location.trim() || null,
        bio: bio.trim() || null,
        join_policy: joinPolicy,
        instagram_url: instagram.trim() || null,
        website_url: website.trim() || null,
      });
      Alert.alert('Saved', 'Club updated.');
      await load();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Unable to save');
    } finally {
      setSaving(false);
    }
  };

  const handleRequest = async (requestId: number, status: 'approved' | 'rejected') => {
    try {
      setSaving(true);
      await reviewJoinRequest(clubId, requestId, status);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Unable to process request');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = (m: any) => {
    Alert.alert(
      'Change Role',
      `Set role for ${m.display_name || m.username}:`,
      [
        ...ROLE_OPTIONS.map((role) => ({
          text: role.charAt(0).toUpperCase() + role.slice(1),
          onPress: async () => {
            try {
              setSaving(true);
              await updateMemberRole(clubId, m.id_profiles, role);
              await load();
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Unable to change role');
            } finally {
              setSaving(false);
            }
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleKick = (m: any) => {
    Alert.alert(
      'Remove Member',
      `Remove ${m.display_name || m.username} from this club?`,
      [
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await removeMember(clubId, m.id_profiles);
              await load();
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Unable to remove member');
            } finally {
              setSaving(false);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: (insets.top || 0) + 4 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Manage Club</Text>
          {!!club?.title && <Text style={styles.headerSub}>{club.title}</Text>}
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>{tab}</Text>
            {tab === 'Overview' && pendingRequests.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingRequests.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}>
        {/* ── Overview Tab ─────────────────────────────────────── */}
        {activeTab === 'Overview' && (
          <>
            {/* Stats */}
            <View style={styles.statsRow}>
              {[
                { label: 'Members', value: club?.members_count ?? 0, icon: 'people-outline' as const },
                { label: 'Pending', value: pendingRequests.length, icon: 'time-outline' as const },
                { label: 'Plans', value: plans.length, icon: 'calendar-outline' as const },
              ].map((s) => (
                <GlassCard key={s.label} variant="medium" radius={12} padding={12} style={styles.statCard}>
                  <Ionicons name={s.icon} size={18} color={colors.primary.main} />
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </GlassCard>
              ))}
            </View>

            {/* Join requests */}
            <Text style={styles.sectionTitle}>Join Requests</Text>
            {pendingRequests.length === 0 ? (
              <EmptyState icon="checkmark-circle-outline" title="No pending requests" />
            ) : (
              pendingRequests.map((r) => (
                <GlassCard key={String(r.id_club_join_requests)} variant="default" radius={12} padding={12}>
                  <View style={styles.requestRow}>
                    <Avatar size="sm">
                      <AvatarFallbackText>{r.display_name?.[0] ?? '?'}</AvatarFallbackText>
                      <AvatarImage source={r.avatar_url ? { uri: r.avatar_url } : undefined} />
                    </Avatar>
                    <View style={styles.flex1}>
                      <Text style={styles.memberName}>{r.display_name || r.username}</Text>
                      <Text style={styles.memberSub}>{new Date(r.created_at).toLocaleDateString()}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => handleRequest(Number(r.id_club_join_requests), 'approved')}
                    >
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => handleRequest(Number(r.id_club_join_requests), 'rejected')}
                    >
                      <Ionicons name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              ))
            )}
          </>
        )}

        {/* ── Members Tab ──────────────────────────────────────── */}
        {activeTab === 'Members' && (
          <>
            <Text style={styles.sectionTitle}>{members.length} Members</Text>
            {members.length === 0 ? (
              <EmptyState icon="people-outline" title="No members yet" />
            ) : (
              members.map((m) => {
                const role = (m.role_title ?? 'member').toLowerCase();
                const roleColor = ROLE_COLORS[role] ?? colors.text.tertiary;
                return (
                  <GlassCard key={String(m.id_profiles)} variant="default" radius={12} padding={12}>
                    <View style={styles.memberManageRow}>
                      <Avatar size="sm">
                        <AvatarFallbackText>{m.display_name?.[0] ?? '?'}</AvatarFallbackText>
                        <AvatarImage source={m.avatar_url ? { uri: m.avatar_url } : undefined} />
                      </Avatar>
                      <View style={styles.flex1}>
                        <Text style={styles.memberName}>{m.display_name || m.username}</Text>
                        <View style={[styles.roleBadge, { borderColor: roleColor + '55', backgroundColor: roleColor + '18' }]}>
                          <Text style={[styles.roleBadgeText, { color: roleColor }]}>{m.role_title}</Text>
                        </View>
                      </View>
                      <TouchableOpacity style={styles.memberActionBtn} onPress={() => handleRoleChange(m)}>
                        <Ionicons name="shield-outline" size={16} color={colors.primary.main} />
                      </TouchableOpacity>
                      {role !== 'owner' && (
                        <TouchableOpacity style={[styles.memberActionBtn, styles.kickBtn]} onPress={() => handleKick(m)}>
                          <Ionicons name="person-remove-outline" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </GlassCard>
                );
              })
            )}
          </>
        )}

        {/* ── Schedule Tab ─────────────────────────────────────── */}
        {activeTab === 'Schedule' && (
          <>
            <SparrButton
              label="+ Create Training Plan"
              variant="primary"
              onPress={() => navigation.navigate('CreateClubCalendar', { clubId })}
              fullWidth
            />
            <Text style={styles.sectionTitle}>Club Training Plans</Text>
            {plans.length === 0 ? (
              <EmptyState icon="calendar-outline" title="No plans yet" subtitle="Create the first training plan for this club." />
            ) : (
              plans.map((plan) => (
                <GlassCard key={String(plan.id_training_calendar)} variant="medium" radius={12} padding={14}>
                  <View style={styles.planRow}>
                    <View style={styles.planIconWrap}>
                      <Ionicons name="barbell-outline" size={18} color={colors.primary.main} />
                    </View>
                    <View style={styles.flex1}>
                      <Text style={styles.planTitle}>{plan.title}</Text>
                      <Text style={styles.planSub}>{plan.trainings_count ?? 0} sessions</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={colors.text.tertiary} />
                  </View>
                </GlassCard>
              ))
            )}
          </>
        )}

        {/* ── Settings Tab ─────────────────────────────────────── */}
        {activeTab === 'Settings' && (
          <>
            {/* Avatar + Cover */}
            <GlassCard variant="medium" radius={14} padding={16}>
              <Text style={styles.sectionTitle}>Club Images</Text>
              <View style={styles.imageRow}>
                <TouchableOpacity style={styles.imagePickerBtn} onPress={() => pickAndUpload('avatar')}>
                  {club?.avatar_url
                    ? <Avatar size="xl"><AvatarImage source={{ uri: club.avatar_url }} /></Avatar>
                    : <Avatar size="xl"><AvatarFallbackText>{club?.title?.[0] ?? 'C'}</AvatarFallbackText></Avatar>
                  }
                  <View style={styles.imagePickerOverlay}>
                    <Ionicons name="camera" size={14} color="#fff" />
                  </View>
                  <Text style={styles.imagePickerLabel}>Avatar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.imagePickerBtn} onPress={() => pickAndUpload('cover')}>
                  <View style={styles.coverThumb}>
                    {club?.cover_url ? (
                      <Image source={{ uri: club.cover_url }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                    ) : (
                      <Ionicons name="image-outline" size={24} color={colors.text.tertiary} />
                    )}
                    <View style={styles.imagePickerOverlay}>
                      <Ionicons name="camera" size={14} color="#fff" />
                    </View>
                  </View>
                  <Text style={styles.imagePickerLabel}>Cover Photo</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>

            {/* Club details form */}
            <GlassCard variant="medium" radius={14} padding={16}>
              <Text style={styles.sectionTitle}>Club Info</Text>
              <FormField label="Club Name" value={title} onChangeText={setTitle} placeholder="Club name" />
              <FormField label="Location" value={location} onChangeText={setLocation} placeholder="City, Country" />
              <FormField label="Bio" value={bio} onChangeText={setBio} placeholder="Tell athletes about your club…" multiline />
            </GlassCard>

            <GlassCard variant="medium" radius={14} padding={16}>
              <Text style={styles.sectionTitle}>Social Links</Text>
              <FormField label="Instagram" value={instagram} onChangeText={setInstagram} placeholder="@yourclub or URL" icon="logo-instagram" />
              <FormField label="Website" value={website} onChangeText={setWebsite} placeholder="yourclub.com" icon="globe-outline" />
            </GlassCard>

            <GlassCard variant="medium" radius={14} padding={16}>
              <Text style={styles.sectionTitle}>Join Policy</Text>
              <View style={styles.policyRow}>
                <Pressable
                  style={[styles.policyBtn, joinPolicy === 'open' && styles.policyBtnActive]}
                  onPress={() => setJoinPolicy('open')}
                >
                  <Ionicons name="people-outline" size={16} color={joinPolicy === 'open' ? colors.primary.main : colors.text.secondary} />
                  <Text style={[styles.policyText, joinPolicy === 'open' && styles.policyTextActive]}>Open</Text>
                </Pressable>
                <Pressable
                  style={[styles.policyBtn, joinPolicy === 'approval' && styles.policyBtnActive]}
                  onPress={() => setJoinPolicy('approval')}
                >
                  <Ionicons name="shield-checkmark-outline" size={16} color={joinPolicy === 'approval' ? colors.primary.main : colors.text.secondary} />
                  <Text style={[styles.policyText, joinPolicy === 'approval' && styles.policyTextActive]}>Approval</Text>
                </Pressable>
              </View>
            </GlassCard>

            <SparrButton label="Save Changes" variant="primary" loading={saving} onPress={saveSettings} fullWidth />
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// FormField helper
// ---------------------------------------------------------------------------
function FormField({ label, value, onChangeText, placeholder, multiline, icon }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; multiline?: boolean; icon?: any;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={fStyles.label}>{label}</Text>
      <View style={fStyles.inputWrap}>
        {icon && <Ionicons name={icon} size={16} color={colors.text.tertiary} style={{ marginLeft: 10 }} />}
        <TextInput
          style={[fStyles.input, multiline && fStyles.multiline, icon && fStyles.withIcon]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.text.tertiary}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
        />
      </View>
    </View>
  );
}

const fStyles = StyleSheet.create({
  label: {
    color: colors.text.secondary, fontSize: 11, fontWeight: '700',
    letterSpacing: 0.8, marginBottom: 6, textTransform: 'uppercase',
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.glass.surface,
    borderRadius: 10, borderWidth: 1, borderColor: colors.glass.border,
    overflow: 'hidden',
  },
  input: {
    flex: 1, color: colors.text.primary,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  withIcon: { paddingLeft: 8 },
  multiline: { height: 76, textAlignVertical: 'top', paddingTop: 10 },
});

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.background.secondary },
  center: { alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border.light,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { color: colors.text.primary, fontSize: 16, fontWeight: '700' },
  headerSub:    { color: colors.text.tertiary, fontSize: 11, marginTop: 2 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.glass.surface, borderWidth: 1, borderColor: colors.glass.border,
    alignItems: 'center', justifyContent: 'center',
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: colors.border.light,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1, paddingVertical: 11, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 4,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: colors.primary.main },
  tabLabel:      { color: colors.text.tertiary, fontSize: 13, fontWeight: '600' },
  tabLabelActive:{ color: colors.text.primary, fontWeight: '700' },
  badge: {
    backgroundColor: colors.primary.main,
    borderRadius: 8, minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Stats
  statsRow:   { flexDirection: 'row', gap: 10 },
  statCard:   { flex: 1, alignItems: 'center', gap: 4 },
  statValue:  { color: colors.text.primary, fontSize: 20, fontWeight: '800' },
  statLabel:  { color: colors.text.tertiary, fontSize: 11 },

  // Section
  sectionTitle: { color: colors.text.primary, fontSize: 14, fontWeight: '700', marginBottom: 4 },

  // Request
  requestRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionBtn:    { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  approveBtn:   { backgroundColor: '#16a34a' },
  rejectBtn:    { backgroundColor: '#dc2626' },

  // Members
  memberManageRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  memberName:      { color: colors.text.primary, fontWeight: '700', fontSize: 14, marginBottom: 4 },
  memberSub:       { color: colors.text.tertiary, fontSize: 11 },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 7, borderWidth: 1,
  },
  roleBadgeText: { fontSize: 11, fontWeight: '700' },
  memberActionBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: colors.glass.surface, borderWidth: 1, borderColor: colors.glass.border,
    alignItems: 'center', justifyContent: 'center',
  },
  kickBtn: { borderColor: '#dc262644', backgroundColor: 'rgba(220,38,38,0.06)' },

  // Plan
  planRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  planIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.glass.redSurface,
    borderWidth: 1, borderColor: colors.glass.redBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  planTitle: { color: colors.text.primary, fontWeight: '700', fontSize: 14 },
  planSub:   { color: colors.text.tertiary, fontSize: 12, marginTop: 2 },

  // Settings
  imageRow:   { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  imagePickerBtn: { alignItems: 'center', gap: 6, position: 'relative' },
  imagePickerOverlay: {
    position: 'absolute', bottom: 24, right: -4,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.primary.main,
    alignItems: 'center', justifyContent: 'center',
  },
  imagePickerLabel: { color: colors.text.tertiary, fontSize: 11 },
  coverThumb: {
    width: 100, height: 60, borderRadius: 10,
    backgroundColor: colors.glass.surface, borderWidth: 1, borderColor: colors.glass.border,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },

  policyRow:     { flexDirection: 'row', gap: 10, marginTop: 4 },
  policyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: colors.glass.border,
    backgroundColor: colors.glass.surface,
  },
  policyBtnActive:  { borderColor: colors.primary.main, backgroundColor: colors.glass.redSurface },
  policyText:       { color: colors.text.secondary, fontWeight: '600', fontSize: 13 },
  policyTextActive: { color: colors.primary.main },

  flex1: { flex: 1 },
});


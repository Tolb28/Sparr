import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { GlassCard } from '@/components/ui/glass-card';
import { RootStackParamList } from '../navigation/AppNavigator';
import { removeMember, updateMemberRole } from '../api/clubs';
import { useThemeColors } from '@/src/hooks/useThemeColors';
import { showSuccessNotification, showErrorNotification } from '@/src/services/notificationService';
import ConfirmationModal from '@/src/components/ConfirmationModal';

type RouteType = RouteProp<RootStackParamList, 'ClubMemberDetail'>;

const ROLE_OPTIONS: { value: string; label: string; icon: any; description: string }[] = [
  { value: 'admin',  label: 'Admin',  icon: 'shield-half-outline', description: 'Can manage members and content' },
  { value: 'coach',  label: 'Coach',  icon: 'fitness-outline',     description: 'Can create training plans' },
  { value: 'member', label: 'Member', icon: 'person-outline',      description: 'Standard club member' },
];

export default function ClubMemberDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteType>();
  const c = useThemeColors();
  const { clubId, member } = route.params;
  const memberName = member.display_name || member.username || 'This member';

  const ROLE_COLORS: Record<string, string> = {
    owner:  '#f5c518',
    admin:  c.primary.main,
    coach:  '#06b6d4',
    member: c.text.tertiary,
  };

  const role = (member.role_title ?? 'member').toLowerCase();
  const isOwner = role === 'owner';
  const roleColor = ROLE_COLORS[role] ?? c.text.tertiary;

  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [currentRole, setCurrentRole] = useState(role);
  const [currentRoleLabel, setCurrentRoleLabel] = useState(member.role_title ?? 'Member');

  const handleRoleChange = async (newRole: string, label: string) => {
    if (newRole === currentRole) return;
    try {
      setSaving(true);
      await updateMemberRole(clubId, member.id_profiles, newRole);
      setCurrentRole(newRole);
      setCurrentRoleLabel(label);
      showSuccessNotification(`${memberName} is now ${label}.`);
    } catch (e: any) {
      showErrorNotification(e?.message ?? 'Unable to change role');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = () => setConfirmRemove(true);

  const doRemove = async () => {
    setConfirmRemove(false);
    try {
      setSaving(true);
      await removeMember(clubId, member.id_profiles);
      showSuccessNotification(`${memberName} has been removed from this club.`);
      navigation.goBack();
    } catch (e: any) {
      showErrorNotification(e?.message ?? 'Unable to remove member');
    } finally {
      setSaving(false);
    }
  };

  const currentRoleColor = ROLE_COLORS[currentRole] ?? c.text.tertiary;

  return (
    <View style={[styles.root, { backgroundColor: c.background.secondary }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: (insets.top || 0) + 4, borderBottomColor: c.border.light }]}>
        <Pressable
          style={[styles.iconBtn, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={20} color={c.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text.primary }]}>Member Details</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 60 }}>
        {/* Profile card */}
        <GlassCard variant="medium" radius={16} padding={20}>
          <View style={styles.profileRow}>
            <TouchableOpacity
              onPress={() => navigation.navigate('ForeignProfile', { foreign_profile_id: member.id_profiles })}
            >
              <Avatar size="xl">
                <AvatarFallbackText>{member.display_name?.[0] ?? '?'}</AvatarFallbackText>
                <AvatarImage source={member.avatar_url ? { uri: member.avatar_url } : undefined} />
              </Avatar>
            </TouchableOpacity>
            <View style={styles.profileInfo}>
              <Text style={[styles.displayName, { color: c.text.primary }]}>{member.display_name || member.username}</Text>
              {!!member.username && (
                <Text style={[styles.username, { color: c.text.tertiary }]}>@{member.username}</Text>
              )}
              {!!member.location && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={12} color={c.text.tertiary} />
                  <Text style={[styles.locationText, { color: c.text.tertiary }]}>{member.location}</Text>
                </View>
              )}
              <View style={[styles.roleBadge, { borderColor: currentRoleColor + '55', backgroundColor: currentRoleColor + '18' }]}>
                <Text style={[styles.roleBadgeText, { color: currentRoleColor }]}>
                  {currentRoleLabel.charAt(0).toUpperCase() + currentRoleLabel.slice(1)}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.viewProfileBtn, { borderTopColor: c.border.light }]}
            onPress={() => navigation.navigate('ForeignProfile', { foreign_profile_id: member.id_profiles })}
          >
            <Ionicons name="person-outline" size={15} color={c.primary.main} />
            <Text style={[styles.viewProfileText, { color: c.primary.main }]}>View Full Profile</Text>
            <Ionicons name="chevron-forward" size={14} color={c.primary.main} />
          </TouchableOpacity>
        </GlassCard>

        {/* Role management — only for non-owners */}
        {!isOwner && (
          <GlassCard variant="medium" radius={16} padding={16}>
            <Text style={[styles.sectionTitle, { color: c.text.primary }]}>Change Role</Text>
            <Text style={[styles.sectionSub, { color: c.text.tertiary }]}>Select the role for this member in your club.</Text>
            <View style={{ gap: 8, marginTop: 12 }}>
              {ROLE_OPTIONS.map((opt) => {
                const selected = currentRole === opt.value;
                const optColor = ROLE_COLORS[opt.value] ?? c.text.tertiary;
                return (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.roleOption,
                      { borderColor: c.glass.border, backgroundColor: c.glass.surface },
                      selected && { borderColor: optColor, backgroundColor: optColor + '14' },
                    ]}
                    onPress={() => handleRoleChange(opt.value, opt.label)}
                    disabled={saving}
                  >
                    <View style={[styles.roleIconWrap, { backgroundColor: optColor + '22', borderColor: optColor + '44' }]}>
                      <Ionicons name={opt.icon} size={18} color={optColor} />
                    </View>
                    <View style={styles.roleOptionInfo}>
                      <Text style={[styles.roleOptionLabel, { color: c.text.primary }, selected && { color: optColor }]}>{opt.label}</Text>
                      <Text style={[styles.roleOptionDesc, { color: c.text.tertiary }]}>{opt.description}</Text>
                    </View>
                    {selected && (
                      saving
                        ? <ActivityIndicator size="small" color={optColor} />
                        : <Ionicons name="checkmark-circle" size={20} color={optColor} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>
        )}

        {/* Danger zone */}
        {!isOwner && (
          <GlassCard variant="red" radius={16} padding={0}>
            <Pressable style={styles.removeBtn} onPress={handleRemove} disabled={saving}>
              <Ionicons name="person-remove-outline" size={18} color="#ef4444" />
              <Text style={styles.removeBtnText}>Remove from Club</Text>
            </Pressable>
          </GlassCard>
        )}

        {isOwner && (
          <GlassCard variant="medium" radius={14} padding={16}>
            <View style={styles.ownerNote}>
              <Ionicons name="shield-checkmark" size={20} color="#f5c518" />
              <Text style={[styles.ownerNoteText, { color: c.text.secondary }]}>
                This member is the club owner and cannot have their role changed or be removed.
              </Text>
            </View>
          </GlassCard>
        )}
      </ScrollView>
      <ConfirmationModal
        visible={confirmRemove}
        title="Remove Member"
        message={`Remove ${member.display_name || member.username} from this club?`}
        confirmText="Remove"
        destructive
        onConfirm={doRemove}
        onCancel={() => setConfirmRemove(false)}
      />
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

  profileRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  profileInfo: { flex: 1, gap: 4 },
  displayName: { fontWeight: '800', fontSize: 18 },
  username: { fontSize: 13 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locationText: { fontSize: 12 },
  roleBadge: {
    alignSelf: 'flex-start', marginTop: 6,
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1,
  },
  roleBadgeText: { fontSize: 12, fontWeight: '700' },
  viewProfileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 16, paddingTop: 14,
    borderTopWidth: 1,
  },
  viewProfileText: { flex: 1, fontWeight: '600', fontSize: 14 },

  sectionTitle: { fontSize: 14, fontWeight: '700' },
  sectionSub: { fontSize: 12, marginTop: 4 },

  roleOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12,
    borderWidth: 1,
  },
  roleIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  roleOptionInfo: { flex: 1 },
  roleOptionLabel: { fontWeight: '700', fontSize: 14 },
  roleOptionDesc: { fontSize: 12, marginTop: 2 },

  removeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 18,
  },
  removeBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },

  ownerNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  ownerNoteText: { flex: 1, fontSize: 13, lineHeight: 19 },
});

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { colors } from '@/src/theme/colors';
import { showSuccessNotification, showErrorNotification } from '@/src/services/notificationService';

type RouteType = RouteProp<RootStackParamList, 'ClubMemberDetail'>;

const ROLE_COLORS: Record<string, string> = {
  owner:  '#f5c518',
  admin:  colors.primary.main,
  coach:  '#06b6d4',
  member: colors.text.tertiary,
};

const ROLE_OPTIONS: { value: string; label: string; icon: any; description: string }[] = [
  { value: 'admin',  label: 'Admin',  icon: 'shield-half-outline', description: 'Can manage members and content' },
  { value: 'coach',  label: 'Coach',  icon: 'fitness-outline',     description: 'Can create training plans' },
  { value: 'member', label: 'Member', icon: 'person-outline',      description: 'Standard club member' },
];

export default function ClubMemberDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteType>();
  const { clubId, member } = route.params;
  const memberName = member.display_name || member.username || 'This member';

  const role = (member.role_title ?? 'member').toLowerCase();
  const isOwner = role === 'owner';
  const roleColor = ROLE_COLORS[role] ?? colors.text.tertiary;

  const [saving, setSaving] = useState(false);
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

  const handleRemove = () => {
    Alert.alert(
      'Remove Member',
      `Remove ${member.display_name || member.username} from this club?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
            onPress: async () => {
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
            },
          },
      ]
    );
  };

  const currentRoleColor = ROLE_COLORS[currentRole] ?? colors.text.tertiary;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: (insets.top || 0) + 4 }]}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Member Details</Text>
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
              <Text style={styles.displayName}>{member.display_name || member.username}</Text>
              {!!member.username && (
                <Text style={styles.username}>@{member.username}</Text>
              )}
              {!!member.location && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={12} color={colors.text.tertiary} />
                  <Text style={styles.locationText}>{member.location}</Text>
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
            style={styles.viewProfileBtn}
            onPress={() => navigation.navigate('ForeignProfile', { foreign_profile_id: member.id_profiles })}
          >
            <Ionicons name="person-outline" size={15} color={colors.primary.main} />
            <Text style={styles.viewProfileText}>View Full Profile</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary.main} />
          </TouchableOpacity>
        </GlassCard>

        {/* Role management — only for non-owners */}
        {!isOwner && (
          <GlassCard variant="medium" radius={16} padding={16}>
            <Text style={styles.sectionTitle}>Change Role</Text>
            <Text style={styles.sectionSub}>Select the role for this member in your club.</Text>
            <View style={{ gap: 8, marginTop: 12 }}>
              {ROLE_OPTIONS.map((opt) => {
                const selected = currentRole === opt.value;
                const optColor = ROLE_COLORS[opt.value] ?? colors.text.tertiary;
                return (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.roleOption,
                      selected && { borderColor: optColor, backgroundColor: optColor + '14' },
                    ]}
                    onPress={() => handleRoleChange(opt.value, opt.label)}
                    disabled={saving}
                  >
                    <View style={[styles.roleIconWrap, { backgroundColor: optColor + '22', borderColor: optColor + '44' }]}>
                      <Ionicons name={opt.icon} size={18} color={optColor} />
                    </View>
                    <View style={styles.roleOptionInfo}>
                      <Text style={[styles.roleOptionLabel, selected && { color: optColor }]}>{opt.label}</Text>
                      <Text style={styles.roleOptionDesc}>{opt.description}</Text>
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
              <Text style={styles.ownerNoteText}>
                This member is the club owner and cannot have their role changed or be removed.
              </Text>
            </View>
          </GlassCard>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.secondary },

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

  profileRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  profileInfo: { flex: 1, gap: 4 },
  displayName: { color: colors.text.primary, fontWeight: '800', fontSize: 18 },
  username: { color: colors.text.tertiary, fontSize: 13 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locationText: { color: colors.text.tertiary, fontSize: 12 },
  roleBadge: {
    alignSelf: 'flex-start', marginTop: 6,
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1,
  },
  roleBadgeText: { fontSize: 12, fontWeight: '700' },
  viewProfileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 16, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: colors.border.light,
  },
  viewProfileText: { flex: 1, color: colors.primary.main, fontWeight: '600', fontSize: 14 },

  sectionTitle: { color: colors.text.primary, fontSize: 14, fontWeight: '700' },
  sectionSub: { color: colors.text.tertiary, fontSize: 12, marginTop: 4 },

  roleOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: colors.glass.border,
    backgroundColor: colors.glass.surface,
  },
  roleIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  roleOptionInfo: { flex: 1 },
  roleOptionLabel: { color: colors.text.primary, fontWeight: '700', fontSize: 14 },
  roleOptionDesc: { color: colors.text.tertiary, fontSize: 12, marginTop: 2 },

  removeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 18,
  },
  removeBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },

  ownerNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  ownerNoteText: { flex: 1, color: colors.text.secondary, fontSize: 13, lineHeight: 19 },
});

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { GlassCard } from '@/components/ui/glass-card';
import { EmptyState } from '@/components/ui/empty-state';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getClubMembers } from '../api/clubs';
import { colors } from '@/src/theme/colors';

type RouteType = RouteProp<RootStackParamList, 'ClubMembers'>;

const ROLE_COLORS: Record<string, string> = {
  owner:  '#f5c518',
  admin:  colors.primary.main,
  coach:  '#06b6d4',
  member: colors.text.tertiary,
};

export default function ClubMembersScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteType>();
  const { clubId, canManage } = route.params;

  const [loading, setLoading]   = useState(true);
  const [members, setMembers]   = useState<any[]>([]);
  const [query, setQuery]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getClubMembers(clubId);
      setMembers(data ?? []);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = members.filter((m) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (m.display_name ?? '').toLowerCase().includes(q) ||
      (m.username ?? '').toLowerCase().includes(q)
    );
  });

  const renderItem = ({ item: m }: { item: any }) => {
    const role = (m.role_title ?? 'member').toLowerCase();
    const roleColor = ROLE_COLORS[role] ?? colors.text.tertiary;

    return (
      <GlassCard variant="default" radius={12} padding={12} style={{ marginBottom: 8 }}>
        <Pressable
          style={styles.memberRow}
          onPress={() => {
            if (canManage) {
              navigation.navigate('ClubMemberDetail', { clubId, member: m });
            } else {
              navigation.navigate('ForeignProfile', { foreign_profile_id: m.id_profiles });
            }
          }}
        >
          <Avatar size="md">
            <AvatarFallbackText>{m.display_name?.[0] ?? '?'}</AvatarFallbackText>
            <AvatarImage source={m.avatar_url ? { uri: m.avatar_url } : undefined} />
          </Avatar>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{m.display_name || m.username}</Text>
            <Text style={styles.memberUsername}>@{m.username}</Text>
          </View>
          <View style={styles.memberRight}>
            <View style={[styles.roleBadge, { borderColor: roleColor + '55', backgroundColor: roleColor + '18' }]}>
              <Text style={[styles.roleBadgeText, { color: roleColor }]}>
                {(m.role_title ?? 'member').charAt(0).toUpperCase() + (m.role_title ?? 'member').slice(1)}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={14} color={colors.text.tertiary} />
        </Pressable>
      </GlassCard>
    );
  };

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
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Members</Text>
          {!loading && (
            <Text style={styles.headerSub}>
              {canManage ? `${members.length} total · tap to manage` : `${members.length} total`}
            </Text>
          )}
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={colors.text.tertiary} style={{ marginLeft: 10 }} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search members…"
            placeholderTextColor={colors.text.tertiary}
            returnKeyType="search"
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} style={{ paddingRight: 10 }} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={16} color={colors.text.tertiary} />
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(m) => String(m.id_profiles)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title={query ? 'No matches' : 'No members yet'}
              subtitle={query ? 'Try a different search' : undefined}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.background.secondary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

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

  searchWrap: { paddingHorizontal: 16, paddingVertical: 10 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.glass.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.glass.border,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1, color: colors.text.primary,
    paddingHorizontal: 10, paddingVertical: 9, fontSize: 14,
  },

  memberRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  memberInfo: { flex: 1 },
  memberName: { color: colors.text.primary, fontWeight: '700', fontSize: 14 },
  memberUsername: { color: colors.text.tertiary, fontSize: 12, marginTop: 2 },

  memberRight: { alignItems: 'flex-end', gap: 6 },
  roleBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1,
  },
  roleBadgeText: { fontSize: 11, fontWeight: '700' },
});

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
import { useThemeColors } from '@/src/hooks/useThemeColors';

type RouteType = RouteProp<RootStackParamList, 'ClubMembers'>;

export default function ClubMembersScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteType>();
  const c = useThemeColors();
  const { clubId, canManage } = route.params;

  const ROLE_COLORS: Record<string, string> = {
    owner:  '#f5c518',
    admin:  c.primary.main,
    coach:  '#06b6d4',
    member: c.text.tertiary,
  };

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
    const roleColor = ROLE_COLORS[role] ?? c.text.tertiary;

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
            <Text style={[styles.memberName, { color: c.text.primary }]}>{m.display_name || m.username}</Text>
            <Text style={[styles.memberUsername, { color: c.text.tertiary }]}>@{m.username}</Text>
          </View>
          <View style={styles.memberRight}>
            <View style={[styles.roleBadge, { borderColor: roleColor + '55', backgroundColor: roleColor + '18' }]}>
              <Text style={[styles.roleBadgeText, { color: roleColor }]}>
                {(m.role_title ?? 'member').charAt(0).toUpperCase() + (m.role_title ?? 'member').slice(1)}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={14} color={c.text.tertiary} />
        </Pressable>
      </GlassCard>
    );
  };

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
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: c.text.primary }]}>Members</Text>
          {!loading && (
            <Text style={[styles.headerSub, { color: c.text.tertiary }]}>
              {canManage ? `${members.length} total · tap to manage` : `${members.length} total`}
            </Text>
          )}
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBox, { backgroundColor: c.glass.surface, borderColor: c.glass.border }]}>
          <Ionicons name="search" size={16} color={c.text.tertiary} style={{ marginLeft: 10 }} />
          <TextInput
            style={[styles.searchInput, { color: c.text.primary }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search members…"
            placeholderTextColor={c.text.tertiary}
            returnKeyType="search"
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} style={{ paddingRight: 10 }} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={16} color={c.text.tertiary} />
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.primary.main} />
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
  root:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 16, fontWeight: '700' },
  headerSub:    { fontSize: 11, marginTop: 2 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },

  searchWrap: { paddingHorizontal: 16, paddingVertical: 10 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10, paddingVertical: 9, fontSize: 14,
  },

  memberRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  memberInfo: { flex: 1 },
  memberName: { fontWeight: '700', fontSize: 14 },
  memberUsername: { fontSize: 12, marginTop: 2 },

  memberRight: { alignItems: 'flex-end', gap: 6 },
  roleBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1,
  },
  roleBadgeText: { fontSize: 11, fontWeight: '700' },
});

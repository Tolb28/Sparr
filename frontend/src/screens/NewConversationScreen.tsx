import React, { useState, useCallback } from 'react';
import {
  FlatList,
  View,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { getFriends } from '../api/friends';
import { createConversation } from '../api/chatApi';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/src/theme/colors';

interface Friend {
  id_profiles: number;
  display_name: string;
  avatar_url: string | null;
}

export default function NewConversationScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Friend[]>([]);
  const [groupTitle, setGroupTitle] = useState('');

  const isGroup = selected.length > 1;

  const loadFriends = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFriends();
      setFriends(data || []);
    } catch {
      setFriends([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFriends();
    }, [loadFriends])
  );

  const toggleFriend = (friend: Friend) => {
    setSelected((prev) =>
      prev.some((f) => f.id_profiles === friend.id_profiles)
        ? prev.filter((f) => f.id_profiles !== friend.id_profiles)
        : [...prev, friend]
    );
  };

  const filteredFriends = friends.filter((f) =>
    f.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) =>
    name.split(' ').map((w) => w[0]).join('').toUpperCase().substring(0, 2);

  const handleStart = async () => {
    if (selected.length === 0) return;
    if (creating) return;
    setCreating(true);
    try {
      const participantIds = selected.map((f) => f.id_profiles);
      const title = isGroup ? (groupTitle.trim() || null) : null;
      const conversation = await createConversation(participantIds, isGroup ? 1 : 0, title);
      const displayName = isGroup
        ? (groupTitle.trim() || selected.map((f) => f.display_name).join(', '))
        : selected[0].display_name;
      navigation.navigate('ChatDetail', {
        conversationId: conversation.id_conversations,
        otherParticipantName: displayName,
        otherParticipantAvatar: isGroup ? null : selected[0].avatar_url,
      });
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create conversation');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: (insets.top || 0) + 6 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Message</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Selected friends chips */}
        {selected.length > 0 && (
          <View style={styles.chipsRow}>
            {selected.map((f) => (
              <Pressable key={f.id_profiles} style={styles.chip} onPress={() => toggleFriend(f)}>
                <Text style={styles.chipText}>{f.display_name}</Text>
                <Ionicons name="close" size={12} color={colors.text.secondary} />
              </Pressable>
            ))}
          </View>
        )}

        {/* Group title input (shown when 2+ selected) */}
        {isGroup && (
          <View style={styles.groupTitleWrap}>
            <Ionicons name="people-outline" size={16} color={colors.text.tertiary} />
            <TextInput
              style={styles.groupTitleInput}
              placeholder="Group name (optional)"
              placeholderTextColor={colors.text.tertiary}
              value={groupTitle}
              onChangeText={setGroupTitle}
            />
          </View>
        )}

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.text.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search friends..."
            placeholderTextColor={colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : (
        <FlatList
          data={filteredFriends}
          keyExtractor={(item) => item.id_profiles.toString()}
          renderItem={({ item }) => {
            const isSelected = selected.some((f) => f.id_profiles === item.id_profiles);
            return (
              <TouchableOpacity onPress={() => toggleFriend(item)} activeOpacity={0.75}>
                <View style={styles.contactRow}>
                  <Avatar size="lg">
                    {item.avatar_url ? (
                      <AvatarImage source={{ uri: item.avatar_url }} alt={item.display_name} />
                    ) : (
                      <AvatarFallbackText>{getInitials(item.display_name)}</AvatarFallbackText>
                    )}
                  </Avatar>
                  <View style={styles.flex1}>
                    <Text style={styles.contactName}>{item.display_name}</Text>
                  </View>
                  <View style={[styles.selectCircle, isSelected && styles.selectCircleActive]}>
                    {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </View>
                <View style={styles.divider} />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No friends match your search' : 'No friends available yet'}
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      )}

      {selected.length > 0 && (
        <View style={[styles.fabWrap, { bottom: Math.max(24, insets.bottom + 12) }]}>
          <Pressable
            onPress={handleStart}
            disabled={creating}
            style={[styles.startBtn, creating && styles.startBtnDisabled]}
          >
            {creating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.startBtnText}>
                {isGroup ? 'Create Group' : 'Start Conversation'}
              </Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.secondary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border.light,
    backgroundColor: colors.background.secondary,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 12 },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, color: colors.text.primary, fontSize: 16, fontWeight: '700' },
  headerRight: { width: 28 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.glass.redSurface, borderWidth: 1, borderColor: colors.primary.main,
    borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5,
  },
  chipText: { color: colors.text.primary, fontSize: 13, fontWeight: '600' },
  groupTitleWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.glass.surface, borderRadius: 10,
    borderWidth: 1, borderColor: colors.glass.border,
    paddingHorizontal: 12, marginBottom: 10,
  },
  groupTitleInput: { flex: 1, color: colors.text.primary, paddingVertical: 10, fontSize: 14 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.glass.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.glass.border, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, color: colors.text.primary, paddingVertical: 11, fontSize: 14 },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  contactName: { color: colors.text.primary, fontWeight: '600', fontSize: 14 },
  flex1: { flex: 1 },
  selectCircle: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: colors.border.medium,
    alignItems: 'center', justifyContent: 'center',
  },
  selectCircleActive: { backgroundColor: colors.primary.main, borderColor: colors.primary.main },
  divider: { height: 1, backgroundColor: colors.border.light, marginLeft: 72 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { color: colors.text.secondary, textAlign: 'center', fontSize: 14 },
  fabWrap: { position: 'absolute', left: 24, right: 24 },
  startBtn: {
    backgroundColor: colors.primary.main, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: colors.primary.main, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  startBtnDisabled: { opacity: 0.5 },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});


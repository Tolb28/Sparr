import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { GlassCard } from '@/components/ui/glass-card';
import {
  getConversationParticipants,
  renameConversation,
  leaveConversation,
  addConversationMembers,
  removeConversationMember,
  getConversation,
} from '../api/chatApi';
import { getFriends } from '../api/friends';
import { getProfile } from '../api/profileHandler';
import { colors } from '@/src/theme/colors';
import { showErrorNotification } from '@/src/services/notificationService';

export default function ConversationSettingsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<any, 'ConversationSettings'>>();
  const insets = useSafeAreaInsets();

  const { conversationId, conversationTitle } = route.params || {};

  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState(conversationTitle || 'Chat');
  const [editingTitle, setEditingTitle] = useState(false);
  const [savingTitle, setSavingTitle] = useState(false);

  // Add members state
  const [addMembersVisible, setAddMembersVisible] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<any[]>([]);
  const [addingMembers, setAddingMembers] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [currentUserProfileId, setCurrentUserProfileId] = useState<number | null>(null);
  const [isGroup, setIsGroup] = useState(false);
  const [infoLoaded, setInfoLoaded] = useState(false);

  const loadParticipants = useCallback(async () => {
    try {
      const data = await getConversationParticipants(conversationId);
      setParticipants(data);
    } catch {
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  useEffect(() => {
    (async () => {
      try {
        const profileData = await getProfile();
        if (!profileData) return;
        const profile = typeof profileData === 'string' ? JSON.parse(profileData) : profileData;
        if (profile?.id_profiles) {
          setCurrentUserProfileId(
            typeof profile.id_profiles === 'number'
              ? profile.id_profiles
              : parseInt(profile.id_profiles, 10)
          );
        }
        const detail = await getConversation(conversationId);
        setIsGroup(Boolean(detail.is_group));
      } catch {
        // Non-fatal
      } finally {
        setInfoLoaded(true);
      }
    })();
  }, [conversationId]);

  const handleSaveTitle = async () => {
    if (!title.trim()) return;
    setSavingTitle(true);
    try {
      await renameConversation(conversationId, title.trim());
      setEditingTitle(false);
      // Propagate updated title back to ChatDetail screen
      navigation.navigate('ChatDetail', { conversationId, otherParticipantName: title.trim() });
    } catch {
      showErrorNotification('Failed to rename conversation');
    } finally {
      setSavingTitle(false);
    }
  };

  const handleLeave = () => {
    Alert.alert('Leave Conversation', 'You will no longer be able to send or receive messages.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveConversation(conversationId);
            navigation.navigate('Conversations');
          } catch {
            showErrorNotification('Failed to leave conversation');
          }
        },
      },
    ]);
  };

  const openAddMembers = async () => {
    setAddMembersVisible(true);
    setFriendSearch('');
    setSelectedFriends([]);
    if (friends.length === 0) {
      setFriendsLoading(true);
      try {
        const data = await getFriends();
        // Exclude already-participants
        const participantIds = new Set(participants.map((p) => p.id_profiles));
        setFriends((data || []).filter((f: any) => !participantIds.has(f.id_profiles)));
      } catch {
        setFriends([]);
      } finally {
        setFriendsLoading(false);
      }
    }
  };

  const toggleFriend = (friend: any) => {
    setSelectedFriends((prev) =>
      prev.some((f) => f.id_profiles === friend.id_profiles)
        ? prev.filter((f) => f.id_profiles !== friend.id_profiles)
        : [...prev, friend]
    );
  };

  const handleAddMembers = async () => {
    if (selectedFriends.length === 0) return;
    setAddingMembers(true);
    try {
      await addConversationMembers(conversationId, selectedFriends.map((f) => f.id_profiles));
      setAddMembersVisible(false);
      setSelectedFriends([]);
      setFriends([]);  // Reset so it reloads next time
      await loadParticipants();
    } catch {
      showErrorNotification('Failed to add members');
    } finally {
      setAddingMembers(false);
    }
  };

  const handleRemoveMember = (participant: any) => {
    Alert.alert(
      'Remove Member',
      `Remove ${participant.display_name || 'this member'} from the group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setIsRemoving(true);
            try {
              await removeConversationMember(conversationId, participant.id_profiles);
              await loadParticipants();
            } catch {
              showErrorNotification('Failed to remove member');
            } finally {
              setIsRemoving(false);
            }
          },
        },
      ]
    );
  };

  const filteredFriends = friends.filter((f) =>
    (f.display_name || '').toLowerCase().includes(friendSearch.toLowerCase())
  );

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: (insets.top || 0) + 6 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Chat Info</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Avatar + Title */}
        <View style={styles.heroSection}>
          <View style={styles.bigAvatar}>
            <Ionicons name="chatbubbles" size={44} color={colors.primary.main} />
          </View>

          {editingTitle ? (
            <View style={styles.titleEditRow}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                style={styles.titleInput}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSaveTitle}
                placeholderTextColor={colors.text.tertiary}
              />
              <Pressable onPress={handleSaveTitle} disabled={savingTitle} style={styles.saveBtn}>
                {savingTitle
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="checkmark" size={20} color="#fff" />}
              </Pressable>
              <Pressable onPress={() => { setTitle(conversationTitle || 'Chat'); setEditingTitle(false); }} style={styles.cancelBtn}>
                <Ionicons name="close" size={20} color={colors.text.secondary} />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setEditingTitle(true)} style={styles.titleRow}>
              <Text style={styles.convTitle}>{title}</Text>
              <Ionicons name="pencil-outline" size={14} color={colors.text.tertiary} style={{ marginLeft: 6 }} />
            </Pressable>
          )}

          <Text style={styles.memberCount}>
            {participants.length} {participants.length === 1 ? 'member' : 'members'}
          </Text>
        </View>

        {/* Members */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>MEMBERS</Text>
          <Pressable style={styles.addBtn} onPress={openAddMembers}>
            <Ionicons name="person-add-outline" size={15} color={colors.primary.main} />
            <Text style={styles.addBtnText}>Add People</Text>
          </Pressable>
        </View>
        <GlassCard variant="default" radius={14} padding={0} style={styles.membersCard}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary.main} />
            </View>
          ) : participants.length === 0 ? (
            <View style={styles.loadingRow}>
              <Text style={styles.emptyText}>No participants found</Text>
            </View>
          ) : (
            participants.map((p: any, i: number) => (
              <View key={String(p.id_profiles)} style={[{ flexDirection: 'row', alignItems: 'center' }, i < participants.length - 1 && styles.memberBorder]}>
                <Pressable
                  style={[styles.memberRow, { flex: 1 }]}
                  onPress={() => navigation.navigate('ForeignProfile', { foreign_profile_id: p.id_profiles })}
                >
                  <Avatar size="sm">
                    <AvatarFallbackText style={styles.avatarFallback}>{p.display_name?.[0] || '?'}</AvatarFallbackText>
                    <AvatarImage source={{ uri: p.avatar || p.avatar_url || undefined }} />
                  </Avatar>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{p.display_name || 'Unknown'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
                </Pressable>
                {infoLoaded && isGroup && currentUserProfileId !== p.id_profiles && (
                  <Pressable
                    onPress={() => handleRemoveMember(p)}
                    disabled={isRemoving}
                    style={[{ paddingHorizontal: 12, paddingVertical: 12 }, isRemoving && { opacity: 0.4 }]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="person-remove-outline" size={18} color={colors.primary.main} />
                  </Pressable>
                )}
              </View>
            ))
          )}
        </GlassCard>

        {/* Danger zone */}
        <GlassCard variant="red" radius={14} padding={0} style={styles.dangerCard}>
          <Pressable onPress={handleLeave} style={styles.leaveBtn}>
            <Ionicons name="exit-outline" size={20} color={colors.primary.main} />
            <Text style={styles.leaveBtnText}>Leave Conversation</Text>
          </Pressable>
        </GlassCard>
      </ScrollView>

      {/* Add Members Modal */}
      <Modal
        visible={addMembersVisible}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setAddMembersVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 8 }]}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add People</Text>
              <Pressable onPress={() => setAddMembersVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={colors.text.secondary} />
              </Pressable>
            </View>

            {/* Search */}
            <View style={styles.modalSearch}>
              <Ionicons name="search" size={15} color={colors.text.tertiary} />
              <TextInput
                style={styles.modalSearchInput}
                value={friendSearch}
                onChangeText={setFriendSearch}
                placeholder="Search friends…"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            {/* Selected chips */}
            {selectedFriends.length > 0 && (
              <View style={styles.selectedRow}>
                {selectedFriends.map((f) => (
                  <Pressable key={f.id_profiles} style={styles.chip} onPress={() => toggleFriend(f)}>
                    <Text style={styles.chipText}>{f.display_name}</Text>
                    <Ionicons name="close-circle" size={14} color={colors.primary.main} />
                  </Pressable>
                ))}
              </View>
            )}

            {/* Friends list */}
            {friendsLoading ? (
              <View style={styles.modalCenter}>
                <ActivityIndicator color={colors.primary.main} />
              </View>
            ) : (
              <FlatList
                data={filteredFriends}
                keyExtractor={(f) => String(f.id_profiles)}
                style={{ maxHeight: 320 }}
                renderItem={({ item: f }) => {
                  const selected = selectedFriends.some((s) => s.id_profiles === f.id_profiles);
                  return (
                    <Pressable style={styles.friendRow} onPress={() => toggleFriend(f)}>
                      <Avatar size="sm">
                        <AvatarFallbackText>{f.display_name?.[0] ?? '?'}</AvatarFallbackText>
                        <AvatarImage source={f.avatar_url ? { uri: f.avatar_url } : undefined} />
                      </Avatar>
                      <Text style={styles.friendName}>{f.display_name}</Text>
                      <View style={[styles.checkCircle, selected && styles.checkCircleSelected]}>
                        {selected && <Ionicons name="checkmark" size={13} color="#fff" />}
                      </View>
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.modalCenter}>
                    <Text style={styles.emptyText}>{friendSearch ? 'No matches' : 'No friends to add'}</Text>
                  </View>
                }
              />
            )}

            {/* Add button */}
            <Pressable
              style={[styles.addConfirmBtn, selectedFriends.length === 0 && styles.addConfirmBtnDisabled]}
              onPress={handleAddMembers}
              disabled={selectedFriends.length === 0 || addingMembers}
            >
              {addingMembers
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.addConfirmText}>
                    Add {selectedFriends.length > 0 ? `${selectedFriends.length} ` : ''}
                    {selectedFriends.length === 1 ? 'Person' : 'People'}
                  </Text>
              }
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.secondary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border.light,
    backgroundColor: colors.background.secondary,
  },
  backBtn: { padding: 6 },
  headerTitle: { color: colors.text.primary, fontSize: 16, fontWeight: '700' },
  heroSection: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20 },
  bigAvatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.background.card,
    borderWidth: 2, borderColor: colors.primary.main,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  convTitle: { color: colors.text.primary, fontSize: 20, fontWeight: '800' },
  titleEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  titleInput: {
    flex: 1, backgroundColor: colors.background.card,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border.medium,
    paddingHorizontal: 12, paddingVertical: 8,
    color: colors.text.primary, fontSize: 16, fontWeight: '700',
  },
  saveBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary.main,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.background.card,
    alignItems: 'center', justifyContent: 'center',
  },
  memberCount: { color: colors.text.tertiary, fontSize: 13, marginTop: 2 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginTop: 8, marginBottom: 6,
  },
  sectionLabel: { color: colors.text.tertiary, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, borderWidth: 1, borderColor: colors.primary.main + '60',
    backgroundColor: colors.glass.redSurface,
  },
  addBtnText: { color: colors.primary.main, fontSize: 12, fontWeight: '700' },

  membersCard: { marginHorizontal: 16, overflow: 'hidden' },
  loadingRow: { padding: 20, alignItems: 'center' },
  emptyText: { color: colors.text.tertiary, fontSize: 13 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  memberBorder: { borderBottomWidth: 1, borderBottomColor: colors.border.light },
  avatarFallback: { color: '#fff', fontSize: 13 },
  memberInfo: { flex: 1 },
  memberName: { color: colors.text.primary, fontSize: 14, fontWeight: '600' },
  dangerCard: { marginHorizontal: 16, marginTop: 16, overflow: 'hidden' },
  leaveBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16 },
  leaveBtnText: { color: colors.primary.main, fontSize: 15, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    borderTopWidth: 1, borderColor: colors.glass.border,
    paddingTop: 4,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border.light,
  },
  modalTitle: { color: colors.text.primary, fontSize: 16, fontWeight: '700' },
  modalCloseBtn: { padding: 4 },
  modalSearch: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginVertical: 10,
    backgroundColor: colors.glass.surface, borderRadius: 10,
    borderWidth: 1, borderColor: colors.glass.border,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  modalSearchInput: { flex: 1, color: colors.text.primary, fontSize: 14 },
  selectedRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 16, paddingBottom: 8,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, backgroundColor: colors.glass.redSurface,
    borderWidth: 1, borderColor: colors.primary.main + '55',
  },
  chipText: { color: colors.primary.main, fontSize: 12, fontWeight: '600' },
  friendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: colors.border.light,
  },
  friendName: { flex: 1, color: colors.text.primary, fontSize: 14, fontWeight: '600' },
  checkCircle: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: colors.glass.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkCircleSelected: {
    backgroundColor: colors.primary.main, borderColor: colors.primary.main,
  },
  modalCenter: { padding: 24, alignItems: 'center' },
  addConfirmBtn: {
    margin: 16, marginTop: 8, paddingVertical: 14,
    borderRadius: 12, backgroundColor: colors.primary.main,
    alignItems: 'center',
  },
  addConfirmBtnDisabled: { backgroundColor: colors.primary.main + '44' },
  addConfirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

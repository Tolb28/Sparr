import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  Pressable as RNPressable,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Pressable } from '@/components/ui/pressable';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/src/theme/colors';
import {
  getConversationParticipants,
  leaveConversation,
  renameConversation,
} from '../api/chatApi';

interface Participant {
  id_profiles: number;
  display_name: string;
  avatar_url: string | null;
}

export default function ConversationInfoScreen() {
  const route = useRoute<RouteProp<any, 'ConversationInfo'>>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  const { conversationId, conversationTitle, isGroup } = route.params || {};
  
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newTitle, setNewTitle] = useState(conversationTitle || '');

  const loadParticipants = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const data = await getConversationParticipants(conversationId);
      setParticipants(data || []);
    } catch (err) {
      console.error('Failed to load participants:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  React.useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  const handleRenameGroup = async () => {
    if (!isGroup || !conversationId) return;
    if (!newTitle.trim()) {
      Alert.alert('Error', 'Group name cannot be empty');
      return;
    }
    try {
      await renameConversation(conversationId, newTitle.trim());
      setEditing(false);
      Alert.alert('Success', 'Group renamed');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to rename group');
    }
  };

  const handleLeaveConversation = async () => {
    if (!conversationId) return;
    Alert.alert(
      'Leave Conversation',
      isGroup ? 'Leave this group?' : 'Delete this conversation?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: isGroup ? 'Leave' : 'Delete',
          onPress: async () => {
            try {
              await leaveConversation(conversationId);
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to leave conversation');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border.light }]}>
        <HStack style={styles.headerRow}>
          <RNPressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </RNPressable>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            {isGroup ? 'Group Info' : 'Conversation Info'}
          </Text>
          <View style={{ width: 24 }} />
        </HStack>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : (
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Group/Conversation Title Section */}
          {isGroup && (
            <VStack style={[styles.section, { paddingHorizontal: 16 }]}>
              <Text style={[styles.sectionLabel, { color: colors.text.tertiary }]}>
                GROUP NAME
              </Text>
              {editing ? (
                <VStack style={styles.editSection}>
                  <TextInput
                    style={[
                      styles.titleInput,
                      { 
                        color: colors.text.primary,
                        backgroundColor: colors.background.card,
                        borderColor: colors.border.light,
                      }
                    ]}
                    placeholder="Group name"
                    placeholderTextColor={colors.text.tertiary}
                    value={newTitle}
                    onChangeText={setNewTitle}
                    autoFocus
                  />
                  <HStack style={styles.editActions}>
                    <Pressable
                      onPress={() => {
                        setEditing(false);
                        setNewTitle(conversationTitle || '');
                      }}
                      style={[
                        styles.editBtn,
                        { backgroundColor: colors.background.card, borderColor: colors.border.light },
                      ]}
                    >
                      <Text style={[styles.editBtnText, { color: colors.text.secondary }]}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleRenameGroup}
                      style={[styles.editBtn, { backgroundColor: colors.primary.main }]}
                    >
                      <Text style={[styles.editBtnText, { color: '#fff' }]}>Save</Text>
                    </Pressable>
                  </HStack>
                </VStack>
              ) : (
                <Pressable
                  onPress={() => setEditing(true)}
                  style={[
                    styles.titleSection,
                    { backgroundColor: colors.background.tertiary, borderColor: colors.border.light },
                  ]}
                >
                  <Text style={[styles.titleText, { color: colors.text.primary }]}>
                    {conversationTitle}
                  </Text>
                  <Ionicons name="pencil-outline" size={18} color={colors.text.tertiary} />
                </Pressable>
              )}
            </VStack>
          )}

          {/* Participants Section */}
          <VStack style={[styles.section, { paddingHorizontal: 16 }]}>
            <Text style={[styles.sectionLabel, { color: colors.text.tertiary }]}>
              {isGroup ? `MEMBERS (${participants.length})` : 'PARTICIPANT'}
            </Text>
            <VStack
              style={[
                styles.participantsList,
                { backgroundColor: colors.background.tertiary, borderColor: colors.border.light },
              ]}
            >
              {participants.map((participant, index) => (
                <View key={participant.id_profiles}>
                  <RNPressable
                    onPress={() =>
                      navigation.navigate('ForeignProfile', {
                        foreign_profile_id: participant.id_profiles,
                      })
                    }
                  >
                    <HStack style={styles.participantRow}>
                      <Avatar size="md">
                        {participant.avatar_url ? (
                          <AvatarImage
                            source={{ uri: participant.avatar_url }}
                            alt={participant.display_name}
                          />
                        ) : (
                          <AvatarFallbackText>
                            {getInitials(participant.display_name)}
                          </AvatarFallbackText>
                        )}
                      </Avatar>
                      <Text
                        style={[styles.participantName, { color: colors.text.primary }]}
                      >
                        {participant.display_name}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={colors.text.tertiary}
                      />
                    </HStack>
                  </RNPressable>
                  {index < participants.length - 1 && (
                    <View
                      style={[styles.divider, { backgroundColor: colors.border.light }]}
                    />
                  )}
                </View>
              ))}
            </VStack>
          </VStack>

          {/* Actions Section */}
          <VStack style={[styles.section, { paddingHorizontal: 16 }]}>
            <Pressable
              onPress={handleLeaveConversation}
              style={[
                styles.actionBtn,
                { backgroundColor: colors.glass.redSurface, borderColor: colors.primary.main },
              ]}
            >
              <Ionicons name="exit-outline" size={18} color={colors.primary.main} />
              <Text style={[styles.actionBtnText, { color: colors.primary.main }]}>
                {isGroup ? 'Leave Group' : 'Delete Conversation'}
              </Text>
            </Pressable>
          </VStack>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerRow: {
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
    gap: 24,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  editSection: {
    gap: 10,
  },
  titleInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
  },
  editActions: {
    gap: 8,
  },
  editBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  participantsList: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  participantRow: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  participantName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  divider: {
    height: 1,
    marginLeft: 56,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/**
 * Chat-related TypeScript interfaces for frontend
 */

export interface ChatProfile {
  id_profiles: number;
  name: string;
  avatar_url: string | null;
}

export interface Message {
  id_messages: number;
  content: string;
  attachments_path: string | null;
  created_at: string;
  edited_at: string | null;
  id_sender: number;
  conversations_id_conversations: number;
  source: string | null;
  senderName: string;
  senderAvatar: string | null; // avatar URL (generated on backend)
}

export interface Conversation {
  id_conversations: number;
  is_group: number;
  title: string | null;
  created_at: string;
}

export interface ConversationPreview {
  id_conversations: number;
  is_group: number;
  title: string | null;
  lastMessage: string;
  lastMessageTimestamp: string;
  otherParticipantId: number;
  otherParticipantName: string;
  otherParticipantAvatar: string | null; // avatar URL (generated on backend)
}

export interface ConversationParticipant {
  id_profiles: number;
  name: string;
  avatar_url: string | null;
  joined_at: string;
  id_last_read: number | null;
}

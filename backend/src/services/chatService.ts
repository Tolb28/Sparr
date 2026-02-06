import { pool } from "../config/db";
import { cloudinaryService } from "./cloudinaryService";

export interface ConversationPreview {
  id_conversations: number;
  is_group: number;
  title: string | null;
  lastMessage: string;
  lastMessageTimestamp: string;
  otherParticipantId: number;
  otherParticipantName: string;
  otherParticipantAvatar: string | null;
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
  senderAvatar: string | null;
}

export interface ConversationDetail {
  id_conversations: number;
  is_group: number;
  title: string | null;
  created_at: string;
}

/**
 * Get all conversations for a user with preview data
 */
export const getUserConversations = async (
  userId: number
): Promise<ConversationPreview[]> => {
  const query = `
    WITH latest_messages AS (
      SELECT DISTINCT ON (conversations_id_conversations)
        conversations_id_conversations,
        content,
        created_at
      FROM messages
      ORDER BY conversations_id_conversations, created_at DESC
    )
    SELECT
      c.id_conversations,
      c.is_group,
      c.title,
      COALESCE(lm.content, '') as lastMessage,
      COALESCE(lm.created_at, c.created_at) as lastMessageTimestamp,
      p.id_profiles as otherParticipantId,
      p.display_name as otherParticipantName,
      p.avatar,
      p.updated_at
    FROM conversations c
    INNER JOIN conversations_profiles cp ON c.id_conversations = cp.conversations_id_conversations
    LEFT JOIN conversations_profiles cp2 ON c.id_conversations = cp2.conversations_id_conversations AND cp2.profiles_id_profiles != $1
    LEFT JOIN profiles p ON cp2.profiles_id_profiles = p.id_profiles
    LEFT JOIN latest_messages lm ON c.id_conversations = lm.conversations_id_conversations
    WHERE cp.profiles_id_profiles = $1
    ORDER BY COALESCE(lm.created_at, c.created_at) DESC;
  `;

  const { rows } = await pool.query(query, [userId]);
  
  // Generate avatar URLs for each conversation
  return rows.map(row => ({
    ...row,
    otherParticipantAvatar: row.avatar ? cloudinaryService.generateAvatarUrl(row.avatar, row.updated_at) : null
  }));
};

/**
 * Get messages for a specific conversation with pagination
 */
export const getMessages = async (
  conversationId: number,
  limit: number = 30,
  offset: number = 0
): Promise<Message[]> => {
  const query = `
    SELECT
      m.id_messages,
      m.content,
      m.attachments_path,
      m.created_at,
      m.edited_at,
      m.id_sender,
      m.conversations_id_conversations,
      m.source,
      p.display_name as senderName,
      p.avatar,
      p.updated_at
    FROM messages m
    INNER JOIN profiles p ON m.id_sender = p.id_profiles
    WHERE m.conversations_id_conversations = $1
    ORDER BY m.created_at ASC
    LIMIT $2
    OFFSET $3;
  `;

  const { rows } = await pool.query(query, [conversationId, limit, offset]);
  
  // Generate avatar URLs for each message
  return rows.map(row => ({
    ...row,
    senderAvatar: row.avatar ? cloudinaryService.generateAvatarUrl(row.avatar, row.updated_at) : null
  }));
};

/**
 * Send a message in a conversation
 */
export const sendMessage = async (
  senderId: number,
  conversationId: number,
  content: string,
  attachmentsPath?: string | null,
  source?: string | null
): Promise<Message> => {
  const query = `
    INSERT INTO messages (
      content,
      attachments_path,
      created_at,
      id_sender,
      conversations_id_conversations,
      source
    )
    VALUES ($1, $2, NOW(), $3, $4, $5)
    RETURNING
      id_messages,
      content,
      attachments_path,
      created_at,
      edited_at,
      id_sender,
      conversations_id_conversations,
      source;
  `;

  const { rows: messageRows } = await pool.query(query, [
    content,
    attachmentsPath || null,
    senderId,
    conversationId,
    source || null,
  ]);

  // Fetch the full message with sender details
  const fullMessageQuery = `
    SELECT
      m.id_messages,
      m.content,
      m.attachments_path,
      m.created_at,
      m.edited_at,
      m.id_sender,
      m.conversations_id_conversations,
      m.source,
      p.display_name as senderName,
      p.avatar,
      p.updated_at
    FROM messages m
    INNER JOIN profiles p ON m.id_sender = p.id_profiles
    WHERE m.id_messages = $1;
  `;

  const { rows } = await pool.query(fullMessageQuery, [messageRows[0].id_messages]);
  
  // Generate avatar URL
  const message = rows[0];
  return {
    ...message,
    senderAvatar: message.avatar ? cloudinaryService.generateAvatarUrl(message.avatar, message.updated_at) : null
  };
};

/**
 * Create a conversation (1-on-1 or group)
 * Returns the conversation ID
 */
export const createConversation = async (
  participantIds: number[],
  isGroup: number = 0,
  title: string | null = null
): Promise<number> => {
  // Check if a conversation already exists between these participants (for 1-on-1)
  if (isGroup === 0 && participantIds.length === 2) {
    const [participant1, participant2] = participantIds;

    const existingQuery = `
      SELECT c.id_conversations
      FROM conversations c
      INNER JOIN conversations_profiles cp1 ON c.id_conversations = cp1.conversations_id_conversations
      INNER JOIN conversations_profiles cp2 ON c.id_conversations = cp2.conversations_id_conversations
      WHERE c.is_group = 0
      AND cp1.profiles_id_profiles = $1
      AND cp2.profiles_id_profiles = $2;
    `;

    const { rows: existingConversations } = await pool.query(existingQuery, [
      participant1,
      participant2,
    ]);

    if (existingConversations.length > 0) {
      return existingConversations[0].id_conversations;
    }
  }

  // Create new conversation
  const createConversationQuery = `
    INSERT INTO conversations (is_group, title, created_at)
    VALUES ($1, $2, NOW())
    RETURNING id_conversations;
  `;

  const { rows: conversationRows } = await pool.query(
    createConversationQuery,
    [isGroup, title]
  );

  const conversationId = conversationRows[0].id_conversations;

  // Add participants to the conversation
  for (const participantId of participantIds) {
    const addParticipantQuery = `
      INSERT INTO conversations_profiles (
        conversations_id_conversations,
        profiles_id_profiles,
        joined_at
      )
      VALUES ($1, $2, NOW());
    `;

    await pool.query(addParticipantQuery, [conversationId, participantId]);
  }

  return conversationId;
};

/**
 * Update the last read message for a user in a conversation
 */
export const updateLastReadMessage = async (
  conversationId: number,
  userId: number,
  messageId: number | null
): Promise<void> => {
  const query = `
    UPDATE conversations_profiles
    SET id_last_read = $1
    WHERE conversations_id_conversations = $2
    AND profiles_id_profiles = $3;
  `;

  await pool.query(query, [messageId, conversationId, userId]);
};

/**
 * Get a specific conversation
 */
export const getConversation = async (
  conversationId: number
): Promise<ConversationDetail | null> => {
  const query = `
    SELECT
      id_conversations,
      is_group,
      title,
      created_at
    FROM conversations
    WHERE id_conversations = $1;
  `;

  const { rows } = await pool.query(query, [conversationId]);
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Get all participants in a conversation
 */
export const getConversationParticipants = async (
  conversationId: number
): Promise<any[]> => {
  const query = `
    SELECT
      p.id_profiles,
      p.display_name as name,
      p.avatar,
      cp.joined_at,
      cp.id_last_read
    FROM conversations_profiles cp
    INNER JOIN profiles p ON cp.profiles_id_profiles = p.id_profiles
    WHERE cp.conversations_id_conversations = $1;
  `;

  const { rows } = await pool.query(query, [conversationId]);
  return rows;
};

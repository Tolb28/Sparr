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
  unreadCount: number;
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
    ),
    other_participants AS (
      SELECT
        cp2.conversations_id_conversations,
        STRING_AGG(p.display_name, ', ' ORDER BY p.display_name) as participant_names,
        (ARRAY_AGG(p.id_profiles ORDER BY p.id_profiles))[1] as first_participant_id,
        (ARRAY_AGG(p.avatar ORDER BY p.id_profiles))[1] as first_avatar,
        (ARRAY_AGG(p.updated_at ORDER BY p.id_profiles))[1] as first_updated_at
      FROM conversations_profiles cp2
      INNER JOIN profiles p ON cp2.profiles_id_profiles = p.id_profiles
      WHERE cp2.profiles_id_profiles != $1
      GROUP BY cp2.conversations_id_conversations
    ),
    unread_counts AS (
      SELECT
        m.conversations_id_conversations,
        COUNT(*)::int as unread_count
      FROM messages m
      INNER JOIN conversations_profiles cp3
        ON m.conversations_id_conversations = cp3.conversations_id_conversations
        AND cp3.profiles_id_profiles = $1
      WHERE (cp3.id_last_read IS NULL OR m.id_messages > cp3.id_last_read)
        AND m.id_sender != $1
      GROUP BY m.conversations_id_conversations
    )
    SELECT
      c.id_conversations,
      c.is_group,
      c.title,
      COALESCE(lm.content, '') as "lastMessage",
      COALESCE(lm.created_at, c.created_at) as "lastMessageTimestamp",
      op.first_participant_id as "otherParticipantId",
      op.participant_names as "otherParticipantName",
      op.first_avatar as avatar,
      op.first_updated_at as updated_at,
      COALESCE(uc.unread_count, 0) as "unreadCount"
    FROM conversations c
    INNER JOIN conversations_profiles cp ON c.id_conversations = cp.conversations_id_conversations
    LEFT JOIN other_participants op ON c.id_conversations = op.conversations_id_conversations
    LEFT JOIN latest_messages lm ON c.id_conversations = lm.conversations_id_conversations
    LEFT JOIN unread_counts uc ON c.id_conversations = uc.conversations_id_conversations
    WHERE cp.profiles_id_profiles = $1
    ORDER BY "lastMessageTimestamp" DESC;
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
      p.display_name as "senderName",
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
      p.display_name as "senderName",
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
 * Rename a conversation
 */
export const renameConversation = async (
  conversationId: number,
  title: string
): Promise<void> => {
  const query = `UPDATE conversations SET title = $1 WHERE id_conversations = $2;`;
  await pool.query(query, [title, conversationId]);
};

/**
 * Delete a conversation (removes participant row; deletes conversation if last member)
 */
export const leaveConversation = async (
  conversationId: number,
  profileId: number
): Promise<void> => {
  await pool.query(
    `DELETE FROM conversations_profiles WHERE conversations_id_conversations = $1 AND profiles_id_profiles = $2`,
    [conversationId, profileId]
  );
  // Clean up conversation and messages if no participants remain
  const { rows } = await pool.query(
    `SELECT COUNT(*) as cnt FROM conversations_profiles WHERE conversations_id_conversations = $1`,
    [conversationId]
  );
  if (parseInt(rows[0].cnt) === 0) {
    await pool.query(`DELETE FROM messages WHERE conversations_id_conversations = $1`, [conversationId]);
    await pool.query(`DELETE FROM conversations WHERE id_conversations = $1`, [conversationId]);
  }
};

/**
 * Add participants to an existing conversation
 */
export const addConversationParticipants = async (
  conversationId: number,
  profileIds: number[]
): Promise<void> => {
  for (const profileId of profileIds) {
    await pool.query(
      `INSERT INTO conversations_profiles (conversations_id_conversations, profiles_id_profiles, joined_at)
       VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING`,
      [conversationId, profileId]
    );
  }
  // Mark conversation as group if >2 participants
  await pool.query(
    `UPDATE conversations SET is_group = 1 WHERE id_conversations = $1
     AND (SELECT COUNT(*) FROM conversations_profiles WHERE conversations_id_conversations = $1) > 2`,
    [conversationId]
  );
};

export const getConversationParticipants = async (
  conversationId: number
): Promise<any[]> => {
  const query = `
    SELECT
      p.id_profiles,
      p.display_name,
      p.avatar,
      p.updated_at,
      cp.joined_at,
      cp.id_last_read
    FROM conversations_profiles cp
    INNER JOIN profiles p ON cp.profiles_id_profiles = p.id_profiles
    WHERE cp.conversations_id_conversations = $1;
  `;

  const { rows } = await pool.query(query, [conversationId]);

  // Generate avatar URLs for each participant
  return rows.map(row => ({
    ...row,
    avatar_url: row.avatar ? cloudinaryService.generateAvatarUrl(row.avatar, row.updated_at) : null
  }));
};

/**
 * Edit an existing message's content (only the original sender may edit)
 */
export const editMessage = async (
  messageId: number,
  senderId: number,
  newContent: string
): Promise<Message | null> => {
  if (!newContent || !newContent.trim()) return null;
  const result = await pool.query(
    `UPDATE messages SET content = $1, edited_at = NOW()
     WHERE id_messages = $2 AND id_sender = $3
     RETURNING id_messages`,
    [newContent, messageId, senderId]
  );
  if (result.rows.length === 0) return null;
  const { rows } = await pool.query(
    `SELECT
      m.id_messages, m.content, m.attachments_path, m.created_at, m.edited_at,
      m.id_sender, m.conversations_id_conversations, m.source,
      p.display_name as "senderName", p.avatar, p.updated_at
     FROM messages m
     INNER JOIN profiles p ON m.id_sender = p.id_profiles
     WHERE m.id_messages = $1`,
    [messageId]
  );
  if (rows.length === 0) return null;
  const msg = rows[0];
  return {
    ...msg,
    senderAvatar: msg.avatar ? cloudinaryService.generateAvatarUrl(msg.avatar, msg.updated_at) : null,
  };
};

/**
 * Remove a specific participant from a conversation; deletes conversation if empty or only 1
 * member remains, or downgrades to DM if exactly 2 members remain after removal.
 * Wrapped in a transaction to prevent partial state.
 */
export const removeConversationParticipant = async (
  conversationId: number,
  profileIdToRemove: number
): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM conversations_profiles
       WHERE conversations_id_conversations = $1 AND profiles_id_profiles = $2`,
      [conversationId, profileIdToRemove]
    );
    const { rows } = await client.query(
      `SELECT COUNT(*)::int as cnt FROM conversations_profiles
       WHERE conversations_id_conversations = $1`,
      [conversationId]
    );
    const remaining = rows[0].cnt;
    if (remaining === 0 || remaining === 1) {
      await client.query(`DELETE FROM messages WHERE conversations_id_conversations = $1`, [conversationId]);
      await client.query(`DELETE FROM conversations WHERE id_conversations = $1`, [conversationId]);
    } else if (remaining === 2) {
      await client.query(
        `UPDATE conversations SET is_group = 0 WHERE id_conversations = $1`,
        [conversationId]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

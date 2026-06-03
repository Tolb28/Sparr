import { Request, Response } from "express";
import {
  getUserConversations,
  getMessages,
  sendMessage,
  createConversation,
  updateLastReadMessage,
  getConversation,
  getConversationParticipants,
  renameConversation,
  leaveConversation,
  addConversationParticipants,
} from "../services/chatService";
import { pool } from "../config/db";

/**
 * Helper function to get profile ID from user ID
 */
const getProfileIdFromUserId = async (userId: string): Promise<number | null> => {
  const query = `SELECT id_profiles FROM profiles WHERE user_id = $1 LIMIT 1;`;
  const { rows } = await pool.query(query, [userId]);
  return rows.length > 0 ? rows[0].id_profiles : null;
};

/**
 * Get all conversations for the authenticated user
 */
export const getConversationsHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // First, get the profile ID from the user ID
    const profileId = await getProfileIdFromUserId(userId);
    
    if (!profileId) {
      res.status(404).json({ error: "User profile not found" });
      return;
    }

    const conversations = await getUserConversations(profileId);
    res.status(200).json(conversations);
  } catch (error) {
    console.error("[CHAT BACKEND] Error fetching conversations:", error);
    console.error("[CHAT BACKEND] Error details:", (error as any).message);
    res.status(500).json({ error: "Failed to fetch conversations", details: (error as any).message });
  }
};

/**
 * Get messages for a specific conversation
 */
export const getMessagesHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { conversationId } = req.params;
    const { limit = 30, offset = 0 } = req.query;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const profileId = await getProfileIdFromUserId(userId);
    if (!profileId) {
      res.status(404).json({ error: "User profile not found" });
      return;
    }

    if (!conversationId) {
      res.status(400).json({ error: "Conversation ID is required" });
      return;
    }

    // Verify user is a participant of this conversation
    const conversation = await getConversation(parseInt(conversationId));
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const participants = await getConversationParticipants(
      parseInt(conversationId)
    );
    const isParticipant = participants.some((p) => p.id_profiles === profileId);

    if (!isParticipant) {
      res.status(403).json({ error: "You are not a participant of this conversation" });
      return;
    }

    const messages = await getMessages(
      parseInt(conversationId),
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.status(200).json(messages);
  } catch (error) {
    console.error("[CHAT BACKEND] Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

/**
 * Send a message in a conversation
 */
export const sendMessageHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { conversationId, content } = req.body;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const profileId = await getProfileIdFromUserId(userId);
    if (!profileId) {
      res.status(404).json({ error: "User profile not found" });
      return;
    }

    if (!conversationId || !content) {
      res
        .status(400)
        .json({ error: "Conversation ID and content are required" });
      return;
    }

    // Verify user is a participant of this conversation
    const conversation = await getConversation(conversationId);
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const participants = await getConversationParticipants(conversationId);
    const isParticipant = participants.some((p) => p.id_profiles === profileId);

    if (!isParticipant) {
      res
        .status(403)
        .json({ error: "You are not a participant of this conversation" });
      return;
    }

    const message = await sendMessage(profileId, conversationId, content);

    res.status(201).json(message);
  } catch (error) {
    console.error("[CHAT BACKEND] Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
};

/**
 * Create or get a conversation with one or more participants
 */
export const createConversationHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { participantIds, isGroup = 0, title } = req.body;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const profileId = await getProfileIdFromUserId(userId);
    if (!profileId) {
      res.status(404).json({ error: "User profile not found" });
      return;
    }

    if (!participantIds || !Array.isArray(participantIds)) {
      res.status(400).json({ error: "Participant IDs array is required" });
      return;
    }

    // Ensure the current user is included in participants
    const allParticipants = [
      ...new Set([profileId, ...participantIds]),
    ];

    if (allParticipants.length < 2) {
      res.status(400).json({
        error: "At least 2 participants (including yourself) are required",
      });
      return;
    }

    const conversationId = await createConversation(
      allParticipants,
      isGroup,
      title
    );

    const conversation = await getConversation(conversationId);

    res.status(201).json({
      id_conversations: conversationId,
      ...conversation,
    });
  } catch (error) {
    console.error("[CHAT BACKEND] Error creating conversation:", error);
    console.error("[CHAT BACKEND] Error details:", (error as any).message);
    res.status(500).json({ error: "Failed to create conversation", details: (error as any).message });
  }
};

/**
 * Get participants of a conversation
 */
export const getParticipantsHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { conversationId } = req.params;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    if (!conversationId || typeof conversationId !== 'string') { res.status(400).json({ error: "Conversation ID required" }); return; }
    const participants = await getConversationParticipants(parseInt(conversationId));
    res.status(200).json({ participants });
  } catch (error) {
    res.status(500).json({ error: "Failed to get participants" });
  }
};

/**
 * Rename a conversation (group title)
 */
export const renameConversationHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { conversationId } = req.params;
    const { title } = req.body;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    if (!conversationId || typeof conversationId !== 'string') { res.status(400).json({ error: "Conversation ID required" }); return; }
    if (!title || typeof title !== 'string' || !title.trim()) { res.status(400).json({ error: "Title is required" }); return; }
    const profileId = await getProfileIdFromUserId(userId);
    if (!profileId) { res.status(404).json({ error: "Profile not found" }); return; }
    const participants = await getConversationParticipants(parseInt(conversationId));
    if (!participants.some((p) => p.id_profiles === profileId)) {
      res.status(403).json({ error: "Not a participant" }); return;
    }
    await renameConversation(parseInt(conversationId), title.trim());
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to rename conversation" });
  }
};

/**
 * Leave / delete a conversation
 */
export const leaveConversationHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { conversationId } = req.params;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    if (!conversationId || typeof conversationId !== 'string') { res.status(400).json({ error: "Conversation ID required" }); return; }
    const profileId = await getProfileIdFromUserId(userId);
    if (!profileId) { res.status(404).json({ error: "Profile not found" }); return; }
    await leaveConversation(parseInt(conversationId), profileId);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to leave conversation" });
  }
};

/**
 * Add members to a conversation
 */
export const addMembersHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { conversationId } = req.params;
    const { participantIds } = req.body;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    if (!conversationId || typeof conversationId !== 'string') { res.status(400).json({ error: "Conversation ID required" }); return; }
    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      res.status(400).json({ error: "participantIds array required" }); return;
    }
    const profileId = await getProfileIdFromUserId(userId);
    if (!profileId) { res.status(404).json({ error: "Profile not found" }); return; }
    const participants = await getConversationParticipants(parseInt(conversationId));
    if (!participants.some((p) => p.id_profiles === profileId)) {
      res.status(403).json({ error: "Not a participant" }); return;
    }
    await addConversationParticipants(parseInt(conversationId), participantIds);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to add members" });
  }
};

/**
 * Get a single conversation by ID (must be a participant)
 */
export const getConversationHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { conversationId } = req.params;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    if (!conversationId || typeof conversationId !== 'string') { res.status(400).json({ error: 'Conversation ID required' }); return; }
    const profileId = await getProfileIdFromUserId(userId);
    if (!profileId) { res.status(404).json({ error: 'Profile not found' }); return; }
    const conversation = await getConversation(parseInt(conversationId));
    if (!conversation) { res.status(404).json({ error: 'Conversation not found' }); return; }
    const participants = await getConversationParticipants(parseInt(conversationId));
    if (!participants.some((p) => p.id_profiles === profileId)) {
      res.status(403).json({ error: 'Not a participant' }); return;
    }
    res.status(200).json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get conversation' });
  }
};

export const updateLastReadHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { conversationId, messageId } = req.body;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const profileId = await getProfileIdFromUserId(userId);
    if (!profileId) {
      res.status(404).json({ error: "User profile not found" });
      return;
    }

    if (!conversationId) {
      res.status(400).json({ error: "Conversation ID is required" });
      return;
    }

    // Verify user is a participant of this conversation
    const conversation = await getConversation(conversationId);
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const participants = await getConversationParticipants(conversationId);
    const isParticipant = participants.some((p) => p.id_profiles === profileId);

    if (!isParticipant) {
      res
        .status(403)
        .json({ error: "You are not a participant of this conversation" });
      return;
    }

    await updateLastReadMessage(conversationId, profileId, messageId || null);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("[CHAT BACKEND] Error updating last read:", error);
    res.status(500).json({ error: "Failed to update last read message" });
  }
};

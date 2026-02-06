import { Router } from "express";
import {
  getConversationsHandler,
  getMessagesHandler,
  sendMessageHandler,
  createConversationHandler,
  updateLastReadHandler,
} from "../controllers/chatController";
import { authenticate } from "../middleware/authMiddleware";

const chatRouter = Router();

// All chat routes require authentication
chatRouter.use(authenticate);

// Get all conversations for the current user
chatRouter.get("/conversations", getConversationsHandler);

// Get messages for a specific conversation
chatRouter.get("/conversations/:conversationId/messages", getMessagesHandler);

// Create a new conversation or get existing one
chatRouter.post("/conversations", createConversationHandler);

// Send a message in a conversation
chatRouter.post("/message", sendMessageHandler);

// Update last read message
chatRouter.put("/conversations/:conversationId/last-read", updateLastReadHandler);

export default chatRouter;

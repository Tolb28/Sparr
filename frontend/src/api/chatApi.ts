import { getToken, ServerIP } from './tokenHandler';
import {
  ConversationPreview,
  Message,
  Conversation,
} from '../types/chat';

const API_BASE_URL = `${ServerIP}/auth/chat`;

/**
 * Fetch all conversations for the current user
 */
export async function fetchConversations(): Promise<ConversationPreview[]> {
  const token = await getToken();

  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}/conversations`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch conversations: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch messages for a specific conversation
 */
export async function fetchMessages(
  conversationId: number,
  limit: number = 30,
  offset: number = 0
): Promise<Message[]> {
  const token = await getToken();

  if (!token) {
    throw new Error('No authentication token found');
  }

  const queryParams = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await fetch(
    `${API_BASE_URL}/conversations/${conversationId}/messages?${queryParams}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.status}`);
  }

  return response.json();
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(
  conversationId: number,
  content: string
): Promise<Message> {
  const token = await getToken();

  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      conversationId,
      content,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.status}`);
  }

  return response.json();
}

/**
 * Create a new conversation with one or more participants
 */
export async function createConversation(
  participantIds: number[],
  isGroup: number = 0,
  title: string | null = null
): Promise<Conversation> {
  const token = await getToken();

  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      participantIds,
      isGroup,
      title,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create conversation: ${response.status}`);
  }

  return response.json();
}

/**
 * Update the last read message for a conversation
 */
export async function updateLastRead(
  conversationId: number,
  messageId: number | null = null
): Promise<void> {
  const token = await getToken();

  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(
    `${API_BASE_URL}/conversations/${conversationId}/last-read`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        conversationId,
        messageId,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update last read: ${response.status}`);
  }
}

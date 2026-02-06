# Task: Implement Chat Feature (Backend & Frontend)

You are an expert Senior Full-Stack Developer specializing in Node.js (TypeScript) and React Native (Expo).
I need you to implement a Chat/Messaging feature into my existing workspace.

## 1. Context & Database Schema
My database is PostgreSQL. You do not have direct access to the DB, so use the following schema definitions to write the SQL queries in the Service layer.

**Tables:**
```sql
-- Conversations Table
create table public.conversations (
  id_conversations serial not null,
  is_group smallint null, -- 0 for 1-on-1, 1 for group
  title character varying(45) null,
  created_at timestamp without time zone not null,
  constraint conversations_pkey primary key (id_conversations)
);

-- Joining Table (Users in Conversations)
create table public.conversations_profiles (
  conversations_id_conversations integer not null,
  profiles_id_profiles integer not null,
  joined_at timestamp without time zone not null,
  id_last_read integer null, -- Pointer to the last message read by this user
  constraint conversations_profiles_pkey primary key (conversations_id_conversations, profiles_id_profiles),
  foreign key (conversations_id_conversations) references conversations (id_conversations),
  foreign key (id_last_read) references messages (id_messages),
  foreign key (profiles_id_profiles) references profiles (id_profiles)
);

-- Messages Table
create table public.messages (
  id_messages serial not null,
  content text not null,
  attachments_path character varying(200) null,
  created_at timestamp without time zone not null,
  edited_at timestamp without time zone null,
  id_sender integer not null,
  conversations_id_conversations integer not null,
  source character varying(200) null,
  constraint messages_pkey primary key (id_messages),
  foreign key (conversations_id_conversations) references conversations (id_conversations),
  foreign key (id_sender) references profiles (id_profiles)
);

2. Backend Implementation Plan (Node.js/TS)
Please analyze my existing backend structure (src/controllers, src/services, src/routes) and create the following files following the exact same coding patterns (error handling, DB connection usage, response formatting).

A. Create src/services/chatService.ts
Implement methods for:

getUserConversations(userId: number):

Fetch all conversations where the user is a participant.

Crucial: Join with profiles to get the other participant's name and avatar (assuming 1-on-1 chat logic) to display in the list.

Include the content and timestamp of the latest message for the preview.

getMessages(conversationId: number, limit: number, offset: number):

Fetch messages for a specific conversation, ordered by created_at DESC.

Join with profiles to get the sender's details.

sendMessage(senderId: number, conversationId: number, content: string):

Insert into public.messages.

createConversation(participantIds: number[]):

Check if a conversation already exists between these users. If not, create a new row in conversations and insert rows into conversations_profiles.

B. Create src/controllers/chatController.ts
Create a controller class that handles the HTTP requests and calls chatService. Ensure you handle req, res, and next properly.

C. Update src/routes/index.ts (or create src/routes/chat.ts)
Define the routes (e.g., GET /chat/conversations, GET /chat/:id/messages, POST /chat/message). Apply the existing authMiddleware to these routes to ensure the user is logged in.

3. Frontend Implementation Plan (React Native Expo)
Analyze my existing frontend structure (src/screens, src/components, src/api). Use NativeWind (Tailwind CSS) for styling.

A. Types
Define TypeScript interfaces for Conversation, Message, and ChatProfile based on the DB schema above.

B. API Layer (src/api/chatApi.ts)
Create functions to interact with the new backend endpoints (e.g., fetchConversations, fetchMessages, sendMessage).

C. Components (src/components/chat/*)
Create these reusable components:

ChatListItem.tsx: Displays a single conversation row (Avatar, Name, Last message preview, Timestamp).

MessageBubble.tsx: Displays a single message. Style it differently if isMe (sent by current user) vs isOther.

Style: User messages aligned right (e.g., blue bg), others aligned left (gray bg).

D. Screens (src/screens/*)
ConversationsScreen.tsx:

Lists all active conversations using FlatList.

On press, navigate to ChatDetail.

ChatDetailScreen.tsx:

Displays the message history (inverted FlatList).

Includes a TextInput and specific Send button at the bottom (KeyboardAvoidingView is essential here).

Fetch messages on mount.

E. Navigation
Tell me where to register these new screens in my src/navigation stack (likely inside a Stack Navigator).

4. Execution Instructions for Copilot
Style Consistency: mimic the existing project structure strictly.

Error Handling: Use try/catch blocks in controllers.

UI/UX: Ensure the chat UI looks modern and responsive using Tailwind classes.

Step-by-Step: specific code blocks for each file requested above.
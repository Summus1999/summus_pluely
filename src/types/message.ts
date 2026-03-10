/**
 * Shared types for chat messages, conversations, and file attachments.
 * These types are used across multiple hooks and components.
 */

/**
 * Represents a single chat message
 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  /**
   * Optional attached files for this message
   */
  attachedFiles?: AttachedFile[];
}

/**
 * Represents a conversation containing multiple messages
 */
export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Represents a file attached to a message
 */
export interface AttachedFile {
  id: string;
  name: string;
  type: string;
  base64: string;
  size: number;
}

/**
 * Role type for chat messages
 */
export type MessageRole = "user" | "assistant" | "system";

/**
 * Conversation metadata (without full messages)
 * Used for conversation lists
 */
export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

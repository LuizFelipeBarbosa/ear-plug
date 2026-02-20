/**
 * @fileoverview Custom hooks for band-venue messaging functionality.
 * Provides conversation listing, message display, and sending capabilities.
 * @module hooks/useMessages
 */

"use client";

import { useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useProfileContext } from "./useProfileContext";

/**
 * Hook for accessing the current band's conversations.
 * Provides conversation list with venue data and unread counts.
 * Only works for authenticated musician users with a band.
 *
 * @returns Object containing conversations, unread count, and actions
 *
 * @example
 * function MessagesPage() {
 *   const { conversations, unreadCount, isLoading, startConversation } = useBandConversations();
 *
 *   return (
 *     <div>
 *       <h1>Messages {unreadCount > 0 && `(${unreadCount})`}</h1>
 *       {conversations.map(conv => (
 *         <ConversationCard
 *           key={conv._id}
 *           conversation={conv}
 *           venueName={conv.venue?.name}
 *           unread={conv.unreadCount}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 */
export function useBandConversations(bandIdOverride?: Id<"bands">) {
  const { mode, bandId } = useProfileContext();
  const resolvedBandId =
    bandIdOverride ?? (mode === "band" ? (bandId as Id<"bands"> | undefined) : undefined);

  /** Array of conversations with venue data and unread counts */
  const conversations = useQuery(
    api.messages.getBandConversations,
    resolvedBandId ? { bandId: resolvedBandId } : "skip"
  );

  /** Total unread message count across all conversations */
  const unreadCount = useQuery(
    api.messages.getUnreadCount,
    resolvedBandId ? { bandId: resolvedBandId } : "skip"
  );

  /** Mutation to start a new conversation or get existing one */
  const startConversation = useMutation(api.messages.startConversation);

  return {
    /** Array of conversation documents with venue and unreadCount properties */
    conversations: conversations ?? [],
    /** Total number of unread messages */
    unreadCount: unreadCount ?? 0,
    /** True while conversations are loading */
    isLoading: resolvedBandId !== undefined && conversations === undefined,
    /** Active band id used for this hook */
    bandId: resolvedBandId,
    /** Mutation to start or get a conversation with a venue */
    startConversation,
  };
}

/**
 * Hook for accessing and managing a single conversation.
 * Provides messages, send functionality, and read status management.
 *
 * @param conversationId - The Convex ID of the conversation, or undefined to skip
 * @returns Object containing messages, loading state, and action functions
 *
 * @example
 * function ConversationView({ conversationId }: { conversationId: Id<"conversations"> }) {
 *   const { messages, isLoading, sendMessage, markAsRead } = useConversation(conversationId);
 *   const [newMessage, setNewMessage] = useState("");
 *
 *   // Mark messages as read when conversation is opened
 *   useEffect(() => {
 *     markAsRead();
 *   }, [conversationId]);
 *
 *   const handleSend = async () => {
 *     if (newMessage.trim()) {
 *       await sendMessage(newMessage);
 *       setNewMessage("");
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       {messages.map(msg => (
 *         <MessageBubble
 *           key={msg._id}
 *           content={msg.content}
 *           sender={msg.sender?.name}
 *           isMine={msg.sender?._id === currentUserId}
 *         />
 *       ))}
 *       <input value={newMessage} onChange={e => setNewMessage(e.target.value)} />
 *       <button onClick={handleSend}>Send</button>
 *     </div>
 *   );
 * }
 */
export function useConversation(conversationId: Id<"conversations"> | undefined) {
  /** Array of messages in the conversation with sender data */
  const messages = useQuery(
    api.messages.getConversationMessages,
    conversationId ? { conversationId } : "skip"
  );

  /** Mutation to send a new message */
  const sendMessageMutation = useMutation(api.messages.send);

  /** Mutation to mark all messages as read */
  const markAsReadMutation = useMutation(api.messages.markAsRead);

  const sendMessage = useCallback(
    (content: string) => {
      if (!conversationId) {
        return Promise.resolve(undefined);
      }
      return sendMessageMutation({ conversationId, content });
    },
    [conversationId, sendMessageMutation]
  );

  const markAsRead = useCallback(() => {
    if (!conversationId) {
      return Promise.resolve(undefined);
    }
    return markAsReadMutation({ conversationId });
  }, [conversationId, markAsReadMutation]);

  return {
    /** Array of message documents with sender property, oldest first */
    messages: messages ?? [],
    /** True while messages are loading */
    isLoading: messages === undefined,
    /**
     * Sends a message in this conversation.
     *
     * @param content - The message text to send
     * @returns Promise that resolves when the message is sent
     */
    sendMessage,
    /**
     * Marks all messages in this conversation as read.
     *
     * @returns Promise that resolves when messages are marked
     */
    markAsRead,
  };
}

"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useBandConversations() {
  const conversations = useQuery(api.messages.getBandConversations);
  const unreadCount = useQuery(api.messages.getUnreadCount);
  const startConversation = useMutation(api.messages.startConversation);

  return {
    conversations: conversations ?? [],
    unreadCount: unreadCount ?? 0,
    isLoading: conversations === undefined,
    startConversation,
  };
}

export function useConversation(conversationId: Id<"conversations"> | undefined) {
  const messages = useQuery(
    api.messages.getConversationMessages,
    conversationId ? { conversationId } : "skip"
  );
  const sendMessage = useMutation(api.messages.send);
  const markAsRead = useMutation(api.messages.markAsRead);

  return {
    messages: messages ?? [],
    isLoading: messages === undefined,
    sendMessage: (content: string) =>
      conversationId && sendMessage({ conversationId, content }),
    markAsRead: () => conversationId && markAsRead({ conversationId }),
  };
}

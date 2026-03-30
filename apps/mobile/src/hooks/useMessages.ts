import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback } from "react";
import { useProfileContext } from "@/context/ProfileContext";

export function useBandConversations(bandIdOverride?: Id<"bands">) {
  const { mode, bandId } = useProfileContext();

  const resolvedBandId =
    bandIdOverride ?? (mode === "band" ? (bandId as Id<"bands"> | undefined) : undefined);

  const conversations = useQuery(
    api.messages.getBandConversations,
    resolvedBandId ? { bandId: resolvedBandId } : "skip",
  );

  const unreadCount = useQuery(
    api.messages.getUnreadCount,
    resolvedBandId ? { bandId: resolvedBandId } : "skip",
  );

  const pendingCohostInvites = useQuery(
    api.eventCohosts.listBandPendingInvites,
    resolvedBandId ? { bandId: resolvedBandId } : "skip",
  );

  const respondToInviteMutation = useMutation(api.eventCohosts.respondToInvite);
  const startConversation = useMutation(api.messages.startConversation);

  const respondToCohostInvite = useCallback(
    (args: { inviteId: Id<"eventCohostInvites">; action: "accept" | "decline" }) =>
      respondToInviteMutation(args),
    [respondToInviteMutation],
  );

  return {
    conversations: conversations ?? [],
    unreadCount: unreadCount ?? 0,
    isLoading: resolvedBandId !== undefined && conversations === undefined,
    bandId: resolvedBandId,
    pendingCohostInvites: pendingCohostInvites ?? [],
    pendingInviteCount: pendingCohostInvites?.length ?? 0,
    startConversation,
    respondToCohostInvite,
  };
}

export function useConversation(conversationId: Id<"conversations"> | undefined) {
  const messages = useQuery(
    api.messages.getConversationMessages,
    conversationId ? { conversationId } : "skip",
  );

  const sendMessageMutation = useMutation(api.messages.send);
  const markAsReadMutation = useMutation(api.messages.markAsRead);

  const sendMessage = useCallback(
    (content: string) => {
      if (!conversationId) return Promise.resolve(undefined);
      return sendMessageMutation({ conversationId, content });
    },
    [conversationId, sendMessageMutation],
  );

  const markAsRead = useCallback(() => {
    if (!conversationId) return Promise.resolve(undefined);
    return markAsReadMutation({ conversationId });
  }, [conversationId, markAsReadMutation]);

  return {
    messages: messages ?? [],
    isLoading: conversationId !== undefined && messages === undefined,
    sendMessage,
    markAsRead,
  };
}

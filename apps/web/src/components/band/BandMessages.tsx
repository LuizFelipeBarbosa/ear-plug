"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { MessageCircle, Send, ArrowLeft, Check, X } from "lucide-react";
import { useBandConversations, useConversation } from "@/hooks/useMessages";
import {
  formatEventTime,
  formatFullDate,
  getRelativeTime,
} from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../../convex/_generated/dataModel";

export function BandMessagesView() {
  const [selectedConversation, setSelectedConversation] =
    useState<Id<"conversations"> | null>(null);

  if (selectedConversation) {
    return (
      <ConversationView
        conversationId={selectedConversation}
        onBack={() => setSelectedConversation(null)}
      />
    );
  }

  return <ConversationsList onSelect={setSelectedConversation} />;
}

function ConversationsList({
  onSelect,
}: {
  onSelect: (id: Id<"conversations">) => void;
}) {
  const {
    conversations,
    isLoading,
    pendingCohostInvites,
    respondToCohostInvite,
  } = useBandConversations();
  const [activeInviteId, setActiveInviteId] = useState<string | null>(null);

  const handleInviteAction = async (
    inviteId: Id<"eventCohostInvites">,
    action: "accept" | "decline",
  ) => {
    setActiveInviteId(inviteId);
    try {
      await respondToCohostInvite({ inviteId, action });
    } finally {
      setActiveInviteId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-band/20 p-4">
        <h1 className="text-xl font-semibold text-foreground">Messages</h1>
      </header>

      {pendingCohostInvites.length > 0 && (
        <section className="p-4 border-b border-border bg-card/40">
          <h2 className="text-xs font-medium text-band mb-3">
            Co-host Invites
          </h2>
          <div className="space-y-2">
            {pendingCohostInvites.map((invite) => (
              <div
                key={invite._id}
                className="border border-band/30 bg-muted p-3 rounded-lg"
              >
                <p className="text-sm font-medium text-foreground truncate">
                  {invite.event?.title?.trim() || "Untitled Gig"}
                </p>
                {typeof invite.event?.dateTime === "number" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatFullDate(invite.event.dateTime)} •{" "}
                    {formatEventTime(invite.event.dateTime)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Host: {invite.hostBand?.name ?? "Unknown Band"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Venue: {invite.event?.venue?.name ?? "Venue TBD"}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleInviteAction(invite._id, "accept")}
                    disabled={
                      activeInviteId === invite._id || !invite.canRespond
                    }
                    className={cn(
                      "flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium border transition-colors rounded-lg",
                      activeInviteId === invite._id || !invite.canRespond
                        ? "border-border text-muted-foreground"
                        : "border-band bg-band text-foreground hover:bg-transparent hover:text-band",
                    )}
                  >
                    <Check className="w-4 h-4" />
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInviteAction(invite._id, "decline")}
                    disabled={
                      activeInviteId === invite._id || !invite.canRespond
                    }
                    className={cn(
                      "flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium border transition-colors rounded-lg",
                      activeInviteId === invite._id || !invite.canRespond
                        ? "border-border text-muted-foreground"
                        : "border-border text-muted-foreground hover:border-red-500/40 hover:text-red-400",
                    )}
                  >
                    <X className="w-4 h-4" />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Conversations List */}
      <div className="divide-y divide-border">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 bg-muted border border-border animate-shimmer rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted w-1/3 animate-shimmer rounded" />
                <div className="h-3 bg-muted w-2/3 animate-shimmer rounded" />
              </div>
            </div>
          ))
        ) : conversations.length > 0 ? (
          conversations.map((conv) => (
            <button
              key={conv._id}
              onClick={() => onSelect(conv._id)}
              className={cn(
                "w-full p-4 flex items-center gap-3 text-left bg-muted border-l-2 border-transparent hover:border-band/30 transition-all",
                conv.unreadCount > 0 && "border-l-fan",
              )}
            >
              {/* Venue Avatar */}
              <div className="w-12 h-12 overflow-hidden bg-card border border-border flex-shrink-0 rounded-lg">
                {conv.venue?.images?.[0] ? (
                  <Image
                    src={conv.venue.images[0]}
                    alt={conv.venue.name}
                    width={48}
                    height={48}
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-band/30 to-fan/30" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3
                    className={cn(
                      "font-medium text-foreground text-sm truncate",
                      conv.unreadCount > 0 && "text-band",
                    )}
                  >
                    {conv.venue?.name || "Unknown Venue"}
                  </h3>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {getRelativeTime(conv.lastMessageAt)}
                  </span>
                </div>
                <p
                  className={cn(
                    "text-sm truncate mt-0.5",
                    conv.unreadCount > 0
                      ? "text-foreground font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  {conv.lastMessagePreview || "No messages yet"}
                </p>
              </div>

              {/* Unread Badge */}
              {conv.unreadCount > 0 && (
                <span className="min-w-[24px] h-6 bg-band text-foreground text-xs font-medium flex items-center justify-center px-1 rounded">
                  {conv.unreadCount}
                </span>
              )}
            </button>
          ))
        ) : pendingCohostInvites.length > 0 ? (
          <div className="p-4 text-xs text-muted-foreground">
            No venue conversations yet.
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function ConversationView({
  conversationId,
  onBack,
}: {
  conversationId: Id<"conversations">;
  onBack: () => void;
}) {
  const { messages, isLoading, sendMessage, markAsRead } =
    useConversation(conversationId);
  const [newMessage, setNewMessage] = useState("");

  // Mark as read when viewing
  useEffect(() => {
    markAsRead();
  }, [markAsRead]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    await sendMessage(newMessage);
    setNewMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card border-b border-band/20 p-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 -ml-2 flex items-center justify-center hover:bg-muted border border-border hover:border-band/30 transition-colors touch-target rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <h1 className="text-base font-medium text-foreground">Conversation</h1>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[70%] p-3 animate-shimmer rounded-lg",
                  i % 2 === 0 ? "ml-auto bg-band/20" : "bg-muted",
                )}
              >
                <div className="h-4 bg-muted w-full rounded" />
              </div>
            ))}
          </div>
        ) : messages.length > 0 ? (
          messages.map((msg) => <MessageBubble key={msg._id} message={msg} />)
        ) : (
          <p className="text-center text-muted-foreground py-8 text-xs">
            No messages yet. Start the conversation!
          </p>
        )}
      </div>

      {/* Input */}
      <div className="bg-card border-t border-band/20 p-4 pb-24">
        <div className="flex items-end gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 px-4 py-3 bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-band transition-colors resize-none rounded-lg"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className={cn(
              "p-3 flex items-center justify-center transition-all border touch-target rounded-lg",
              newMessage.trim()
                ? "bg-band text-foreground border-band hover:bg-transparent hover:text-band"
                : "bg-muted border-border text-muted-foreground",
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: any }) {
  // Simplified: assume even IDs are "ours" for demo
  const isOwn = message.senderId?.includes("a");

  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] px-4 py-3 rounded-lg",
          isOwn
            ? "bg-band text-foreground"
            : "bg-muted border border-border text-foreground",
        )}
      >
        <p className="text-sm">{message.content}</p>
        <p
          className={cn(
            "text-xs mt-1",
            isOwn ? "text-foreground/70" : "text-muted-foreground",
          )}
        >
          {getRelativeTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4 border border-dashed border-border rounded-lg">
      <div className="w-16 h-16 bg-muted border border-border flex items-center justify-center mb-4 rounded-lg">
        <MessageCircle className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-2">
        No conversations yet
      </h3>
      <p className="text-muted-foreground max-w-[250px] text-sm">
        Apply to open dates to start conversations with venues
      </p>
    </div>
  );
}

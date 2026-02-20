"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { MessageCircle, Send, ArrowLeft } from "lucide-react";
import { useBandConversations, useConversation } from "@/hooks/useMessages";
import { getRelativeTime } from "@ear-plug/shared/constants";
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
  const { conversations, isLoading } = useBandConversations();

  return (
    <div className="min-h-screen bg-night">
      {/* Header */}
      <header className="bg-night-secondary border-b-2 border-lime/20 p-4">
        <h1 className="text-2xl font-bold text-white uppercase tracking-tight">
          Messages
        </h1>
      </header>

      {/* Conversations List */}
      <div className="divide-y-2 divide-zinc-800">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 bg-night-tertiary border-2 border-zinc-800 animate-shimmer" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-night-tertiary w-1/3 animate-shimmer" />
                <div className="h-3 bg-night-tertiary w-2/3 animate-shimmer" />
              </div>
            </div>
          ))
        ) : conversations.length > 0 ? (
          conversations.map((conv) => (
            <button
              key={conv._id}
              onClick={() => onSelect(conv._id)}
              className={cn(
                "w-full p-4 flex items-center gap-3 text-left bg-night-tertiary border-x-2 border-transparent hover:border-lime/30 transition-all",
                conv.unreadCount > 0 && "border-l-2 border-l-lime"
              )}
            >
              {/* Venue Avatar */}
              <div className="w-12 h-12 overflow-hidden bg-night-secondary border-2 border-zinc-800 flex-shrink-0">
                {conv.venue?.images?.[0] ? (
                  <Image
                    src={conv.venue.images[0]}
                    alt={conv.venue.name}
                    width={48}
                    height={48}
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet/30 to-lime/30" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3
                    className={cn(
                      "font-bold text-white uppercase tracking-wide text-sm truncate",
                      conv.unreadCount > 0 && "text-lime"
                    )}
                  >
                    {conv.venue?.name || "Unknown Venue"}
                  </h3>
                  <span className="text-xs text-zinc-500 uppercase tracking-wider flex-shrink-0">
                    {getRelativeTime(conv.lastMessageAt)}
                  </span>
                </div>
                <p
                  className={cn(
                    "text-sm truncate mt-0.5",
                    conv.unreadCount > 0
                      ? "text-white font-medium"
                      : "text-zinc-500"
                  )}
                >
                  {conv.lastMessagePreview || "No messages yet"}
                </p>
              </div>

              {/* Unread Badge */}
              {conv.unreadCount > 0 && (
                <span className="min-w-[24px] h-6 bg-lime text-night text-xs font-bold flex items-center justify-center px-1">
                  {conv.unreadCount}
                </span>
              )}
            </button>
          ))
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
    <div className="min-h-screen flex flex-col bg-night">
      {/* Header */}
      <header className="bg-night-secondary border-b-2 border-lime/20 p-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 -ml-2 flex items-center justify-center hover:bg-night-tertiary border border-zinc-800 hover:border-lime/30 transition-colors touch-target"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-400" />
        </button>
        <h1 className="text-lg font-bold text-white uppercase tracking-wide">
          Conversation
        </h1>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[70%] p-3 animate-shimmer",
                  i % 2 === 0 ? "ml-auto bg-lime/20" : "bg-night-tertiary"
                )}
              >
                <div className="h-4 bg-zinc-800 w-full" />
              </div>
            ))}
          </div>
        ) : messages.length > 0 ? (
          messages.map((msg) => (
            <MessageBubble key={msg._id} message={msg} />
          ))
        ) : (
          <p className="text-center text-zinc-500 py-8 uppercase text-xs tracking-wider">
            No messages yet. Start the conversation!
          </p>
        )}
      </div>

      {/* Input */}
      <div className="bg-night-secondary border-t-2 border-lime/20 p-4 pb-24">
        <div className="flex items-end gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 px-4 py-3 bg-night-tertiary border-2 border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime transition-colors resize-none"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className={cn(
              "p-3 flex items-center justify-center transition-all border-2 touch-target",
              newMessage.trim()
                ? "bg-lime text-night border-lime hover:bg-transparent hover:text-lime"
                : "bg-night-tertiary border-zinc-800 text-zinc-600"
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
          "max-w-[70%] px-4 py-3",
          isOwn
            ? "bg-lime text-night"
            : "bg-night-tertiary border-2 border-zinc-800 text-white"
        )}
      >
        <p className="text-sm">{message.content}</p>
        <p
          className={cn(
            "text-xs mt-1 uppercase tracking-wider",
            isOwn ? "text-night/70" : "text-zinc-500"
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
    <div className="flex flex-col items-center justify-center py-16 text-center px-4 border-2 border-dashed border-zinc-800">
      <div className="w-16 h-16 bg-night-tertiary border-2 border-zinc-800 flex items-center justify-center mb-4">
        <MessageCircle className="w-8 h-8 text-zinc-600" />
      </div>
      <h3 className="text-lg font-bold text-white uppercase tracking-wide mb-2">
        No conversations yet
      </h3>
      <p className="text-zinc-500 max-w-[250px]">
        Apply to open dates to start conversations with venues
      </p>
    </div>
  );
}

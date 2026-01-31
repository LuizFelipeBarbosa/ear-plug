"use client";

import { useState } from "react";
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
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white dark:bg-surface-dark border-b border-gray-200 dark:border-gray-800 p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Messages
        </h1>
      </header>

      {/* Conversations List */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3 animate-pulse" />
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-2/3 animate-pulse" />
              </div>
            </div>
          ))
        ) : conversations.length > 0 ? (
          conversations.map((conv) => (
            <button
              key={conv._id}
              onClick={() => onSelect(conv._id)}
              className={cn(
                "w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-surface-dark-secondary transition-colors",
                conv.unreadCount > 0 && "border-l-4 border-primary-500"
              )}
            >
              {/* Venue Avatar */}
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                {conv.venue?.images?.[0] ? (
                  <Image
                    src={conv.venue.images[0]}
                    alt={conv.venue.name}
                    width={48}
                    height={48}
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary-400 to-accent-400" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3
                    className={cn(
                      "font-medium text-gray-900 dark:text-white truncate",
                      conv.unreadCount > 0 && "font-semibold"
                    )}
                  >
                    {conv.venue?.name || "Unknown Venue"}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {getRelativeTime(conv.lastMessageAt)}
                  </span>
                </div>
                <p
                  className={cn(
                    "text-sm truncate mt-0.5",
                    conv.unreadCount > 0
                      ? "text-gray-900 dark:text-white font-medium"
                      : "text-gray-500 dark:text-gray-400"
                  )}
                >
                  {conv.lastMessagePreview || "No messages yet"}
                </p>
              </div>

              {/* Unread Badge */}
              {conv.unreadCount > 0 && (
                <span className="w-6 h-6 rounded-full bg-primary-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
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
  useState(() => {
    markAsRead();
  });

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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-surface-dark border-b border-gray-200 dark:border-gray-800 p-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
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
                  "max-w-[70%] p-3 rounded-2xl animate-pulse",
                  i % 2 === 0 ? "ml-auto bg-primary-100" : "bg-gray-100"
                )}
              >
                <div className="h-4 bg-gray-300 rounded w-full" />
              </div>
            ))}
          </div>
        ) : messages.length > 0 ? (
          messages.map((msg) => (
            <MessageBubble key={msg._id} message={msg} />
          ))
        ) : (
          <p className="text-center text-gray-500 py-8">
            No messages yet. Start the conversation!
          </p>
        )}
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-surface-dark border-t border-gray-200 dark:border-gray-800 p-4 pb-24">
        <div className="flex items-end gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-surface-dark-secondary rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className={cn(
              "p-3 rounded-xl transition-colors",
              newMessage.trim()
                ? "bg-primary-500 text-white hover:bg-primary-600"
                : "bg-gray-100 dark:bg-surface-dark-secondary text-gray-400"
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
          "max-w-[70%] px-4 py-3 rounded-2xl",
          isOwn
            ? "bg-primary-500 text-white rounded-br-sm"
            : "bg-gray-100 dark:bg-surface-dark-secondary text-gray-900 dark:text-white rounded-bl-sm"
        )}
      >
        <p className="text-sm">{message.content}</p>
        <p
          className={cn(
            "text-xs mt-1",
            isOwn ? "text-white/70" : "text-gray-400"
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
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-surface-dark-secondary flex items-center justify-center mb-4">
        <MessageCircle className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        No conversations yet
      </h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-[250px]">
        Apply to open dates to start conversations with venues
      </p>
    </div>
  );
}

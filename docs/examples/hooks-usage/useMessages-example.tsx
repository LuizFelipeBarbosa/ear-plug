/**
 * useMessages Hook Usage Examples
 *
 * Complete examples demonstrating real-time messaging functionality
 * for band-venue communication.
 */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  useBandConversations,
  useConversation,
} from "@/hooks/useMessages";
import { useCurrentUser } from "@/hooks/useUser";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { getRelativeTime } from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";

// =============================================================================
// EXAMPLE 1: Conversation List with Unread Badges
// =============================================================================

/**
 * Message inbox showing all conversations.
 * Demonstrates useBandConversations hook for listing conversations.
 */
export function MessageInboxExample() {
  const { conversations, unreadCount, isLoading } = useBandConversations();
  const [selectedId, setSelectedId] = useState<Id<"conversations"> | null>(null);

  return (
    <div className="h-[600px] flex border border-zinc-800">
      {/* Conversation List */}
      <div className="w-80 border-r border-zinc-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white">Messages</h2>
          {unreadCount > 0 && (
            <p className="text-sm text-lime">
              {unreadCount} unread
            </p>
          )}
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <ConversationListSkeleton />
          ) : conversations.length === 0 ? (
            <EmptyInbox />
          ) : (
            <ul className="divide-y divide-zinc-800">
              {conversations.map((conv) => (
                <ConversationItem
                  key={conv._id}
                  conversation={conv}
                  isSelected={selectedId === conv._id}
                  onClick={() => setSelectedId(conv._id)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Message Thread */}
      <div className="flex-1 flex flex-col">
        {selectedId ? (
          <ConversationThreadExample conversationId={selectedId} />
        ) : (
          <EmptyThreadPlaceholder />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// EXAMPLE 2: Single Conversation Thread
// =============================================================================

/**
 * Message thread with real-time updates.
 * Demonstrates useConversation hook for messages and sending.
 */
export function ConversationThreadExample({
  conversationId,
}: {
  conversationId: Id<"conversations">;
}) {
  const { user } = useCurrentUser();
  const { messages, isLoading, sendMessage, markAsRead } = useConversation(conversationId);

  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mark messages as read when conversation opens
  useEffect(() => {
    markAsRead();
  }, [conversationId, markAsRead]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message handler
  const handleSend = async () => {
    const content = newMessage.trim();
    if (!content || isSending) return;

    setIsSending(true);
    setNewMessage(""); // Optimistic clear

    try {
      await sendMessage(content);
    } catch (error) {
      setNewMessage(content); // Restore on error
      console.error("Failed to send:", error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return <MessageThreadSkeleton />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-zinc-500 py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender?._id === user?._id;
            return (
              <MessageBubble
                key={msg._id}
                content={msg.content}
                timestamp={msg.timestamp}
                isOwn={isOwn}
                senderName={msg.sender?.name}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 px-4 py-3 bg-night-tertiary border border-zinc-800 text-white placeholder-zinc-500 focus:border-lime outline-none resize-none"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className={cn(
              "px-4 font-bold transition-colors",
              newMessage.trim() && !isSending
                ? "bg-lime text-night hover:bg-lime/90"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            )}
          >
            {isSending ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// EXAMPLE 3: Starting a New Conversation
// =============================================================================

/**
 * Component for starting a new conversation with a venue.
 * Demonstrates the startConversation mutation.
 */
export function NewConversationExample({
  bandId,
  venueId,
  venueName,
}: {
  bandId: Id<"bands">;
  venueId: Id<"venues">;
  venueName: string;
}) {
  const { startConversation, isLoading } = useBandConversations();
  const [message, setMessage] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [conversationId, setConversationId] = useState<Id<"conversations"> | null>(null);

  const handleStart = async () => {
    if (isStarting) return;

    setIsStarting(true);

    try {
      const convId = await startConversation({
        bandId,
        venueId,
        initialMessage: message.trim() || undefined,
      });
      setConversationId(convId);
    } catch (error) {
      console.error("Failed to start conversation:", error);
    } finally {
      setIsStarting(false);
    }
  };

  // Show conversation thread if we've started one
  if (conversationId) {
    return <ConversationThreadExample conversationId={conversationId} />;
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-2">
          Message {venueName}
        </h2>
        <p className="text-zinc-400">
          Start a conversation to discuss booking opportunities.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-400 mb-2">
            Initial message (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hi! I'd like to discuss playing at your venue..."
            rows={4}
            className="w-full px-4 py-3 bg-night-tertiary border border-zinc-800 text-white placeholder-zinc-500 focus:border-lime outline-none resize-none"
          />
        </div>

        <button
          onClick={handleStart}
          disabled={isStarting}
          className="w-full py-3 bg-lime text-night font-bold hover:bg-lime/90 disabled:opacity-50"
        >
          {isStarting ? "Starting..." : "Start Conversation"}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// EXAMPLE 4: Unread Messages Badge
// =============================================================================

/**
 * Navigation badge showing unread message count.
 * Demonstrates using getUnreadCount in the UI.
 */
export function MessagesNavBadgeExample() {
  const { unreadCount } = useBandConversations();

  return (
    <a href="/messages" className="relative inline-flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white">
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
      <span>Messages</span>

      {/* Unread Badge */}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold bg-lime text-night rounded-full">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </a>
  );
}

// =============================================================================
// EXAMPLE 5: Message Search (Conceptual)
// =============================================================================

/**
 * Search within messages.
 * Note: This requires additional backend support.
 */
export function MessageSearchExample() {
  const [query, setQuery] = useState("");
  const { conversations, isLoading } = useBandConversations();

  // Client-side search (for demo - real impl would be server-side)
  const filteredConversations = conversations.filter(
    (conv) =>
      conv.venue?.name.toLowerCase().includes(query.toLowerCase()) ||
      conv.lastMessagePreview?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations..."
          className="w-full pl-10 pr-4 py-3 bg-night-tertiary border border-zinc-800 text-white placeholder-zinc-500 focus:border-lime outline-none"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Results */}
      {query && (
        <p className="text-sm text-zinc-400">
          {filteredConversations.length} result
          {filteredConversations.length !== 1 && "s"} for "{query}"
        </p>
      )}

      {/* List */}
      {isLoading ? (
        <ConversationListSkeleton />
      ) : (
        <ul className="divide-y divide-zinc-800 border border-zinc-800">
          {filteredConversations.map((conv) => (
            <ConversationItem
              key={conv._id}
              conversation={conv}
              onClick={() => {}}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// =============================================================================
// EXAMPLE 6: Typing Indicator Pattern
// =============================================================================

/**
 * Typing indicator component.
 * Note: This requires additional backend support for real-time typing status.
 */
export function TypingIndicatorExample({
  isTyping,
  typingUserName,
}: {
  isTyping: boolean;
  typingUserName?: string;
}) {
  if (!isTyping) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-zinc-400 text-sm">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" />
        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:150ms]" />
        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
      <span>{typingUserName || "Someone"} is typing...</span>
    </div>
  );
}

/**
 * Hook pattern for implementing typing indicators.
 */
export function useTypingIndicator(conversationId: Id<"conversations">) {
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Call this when user types
  const onType = useCallback(() => {
    setIsTyping(true);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout to stop typing
    timeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  }, []);

  // In a real implementation, you would:
  // 1. Send typing status to backend when isTyping changes
  // 2. Subscribe to other users' typing status

  return {
    isTyping,
    onType,
  };
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface ConversationData {
  _id: Id<"conversations">;
  lastMessageAt: number;
  lastMessagePreview?: string;
  unreadCount: number;
  venue?: {
    name: string;
    city: string;
  } | null;
}

function ConversationItem({
  conversation,
  isSelected = false,
  onClick,
}: {
  conversation: ConversationData;
  isSelected?: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className={cn(
          "w-full p-4 text-left hover:bg-night-tertiary transition-colors",
          isSelected && "bg-night-tertiary border-l-2 border-lime"
        )}
      >
        <div className="flex items-center gap-3">
          {/* Avatar placeholder */}
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">🏢</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3
                className={cn(
                  "font-medium truncate",
                  conversation.unreadCount > 0 ? "text-white" : "text-zinc-300"
                )}
              >
                {conversation.venue?.name || "Unknown"}
              </h3>
              <span className="text-xs text-zinc-500 flex-shrink-0">
                {getRelativeTime(conversation.lastMessageAt)}
              </span>
            </div>
            {conversation.lastMessagePreview && (
              <p
                className={cn(
                  "text-sm truncate",
                  conversation.unreadCount > 0
                    ? "text-zinc-300 font-medium"
                    : "text-zinc-500"
                )}
              >
                {conversation.lastMessagePreview}
              </p>
            )}
          </div>

          {conversation.unreadCount > 0 && (
            <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold bg-lime text-night rounded-full">
              {conversation.unreadCount}
            </span>
          )}
        </div>
      </button>
    </li>
  );
}

function MessageBubble({
  content,
  timestamp,
  isOwn,
  senderName,
}: {
  content: string;
  timestamp: number;
  isOwn: boolean;
  senderName?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        isOwn ? "items-end" : "items-start"
      )}
    >
      {!isOwn && senderName && (
        <span className="text-xs text-zinc-500 px-3">{senderName}</span>
      )}
      <div
        className={cn(
          "max-w-[80%] px-4 py-2 rounded-2xl",
          isOwn ? "bg-lime text-night" : "bg-night-tertiary text-white"
        )}
      >
        {content}
      </div>
      <span className="text-xs text-zinc-500 px-3">
        {getRelativeTime(timestamp)}
      </span>
    </div>
  );
}

function ConversationListSkeleton() {
  return (
    <div className="divide-y divide-zinc-800">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 p-4 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-zinc-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-zinc-800 rounded w-3/4" />
            <div className="h-3 bg-zinc-800 rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageThreadSkeleton() {
  return (
    <div className="flex-1 p-4 space-y-4 animate-pulse">
      <div className="flex flex-col items-start gap-1">
        <div className="h-3 w-20 bg-zinc-800 rounded" />
        <div className="h-10 w-48 bg-zinc-800 rounded-2xl" />
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="h-10 w-56 bg-zinc-800 rounded-2xl" />
        <div className="h-3 w-16 bg-zinc-800 rounded" />
      </div>
      <div className="flex flex-col items-start gap-1">
        <div className="h-3 w-20 bg-zinc-800 rounded" />
        <div className="h-16 w-72 bg-zinc-800 rounded-2xl" />
      </div>
    </div>
  );
}

function EmptyInbox() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-night-tertiary flex items-center justify-center">
        <svg
          className="w-8 h-8 text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">No messages yet</h3>
      <p className="text-zinc-400 text-sm">
        Start by contacting a venue about booking.
      </p>
    </div>
  );
}

function EmptyThreadPlaceholder() {
  return (
    <div className="flex-1 flex items-center justify-center text-center p-8">
      <div>
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-night-tertiary flex items-center justify-center">
          <svg
            className="w-10 h-10 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Select a conversation
        </h3>
        <p className="text-zinc-400 text-sm">
          Choose a conversation from the list to view messages.
        </p>
      </div>
    </div>
  );
}

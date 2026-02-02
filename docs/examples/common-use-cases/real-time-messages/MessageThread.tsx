/**
 * Message Thread Component
 *
 * Displays a conversation's messages and provides message sending capability.
 * Features real-time message updates via Convex subscriptions.
 *
 * Key features:
 * - Real-time message display
 * - Auto-scroll to newest messages
 * - Message grouping by sender
 * - Read receipt marking
 * - Optimistic sending
 */
"use client";

import { useState, useEffect, useRef } from "react";
import { useConversation } from "@/hooks/useMessages";
import { useCurrentUser } from "@/hooks/useUser";
import { getRelativeTime } from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../../../convex/_generated/dataModel";

/**
 * Message data structure.
 */
interface Message {
  _id: Id<"messages">;
  content: string;
  timestamp: number;
  read: boolean;
  sender?: {
    _id: Id<"users">;
    name: string;
    avatar?: string;
  } | null;
}

interface MessageThreadProps {
  /** Conversation ID to display */
  conversationId: Id<"conversations">;
  /** Venue name for header display */
  venueName?: string;
}

/**
 * Complete message thread component with send functionality.
 *
 * @example
 * // Basic usage
 * <MessageThread conversationId={conversationId} venueName="The Fillmore" />
 *
 * @example
 * // In a page
 * export default function ConversationPage({ params }) {
 *   return (
 *     <MessageThread
 *       conversationId={params.id as Id<"conversations">}
 *     />
 *   );
 * }
 */
export function MessageThread({ conversationId, venueName }: MessageThreadProps) {
  const { user } = useCurrentUser();
  const { messages, isLoading, sendMessage, markAsRead } = useConversation(conversationId);

  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (conversationId) {
      markAsRead();
    }
  }, [conversationId, markAsRead]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle message send
  const handleSend = async () => {
    const content = newMessage.trim();
    if (!content || isSending) return;

    setIsSending(true);
    setNewMessage("");

    try {
      await sendMessage(content);
      // Refocus input after sending
      inputRef.current?.focus();
    } catch (error) {
      // Restore message on error
      setNewMessage(content);
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle Enter key to send (Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-zinc-800">
        <button
          onClick={() => history.back()}
          className="md:hidden p-2 text-zinc-400 hover:text-white"
        >
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div>
          <h2 className="font-bold text-white">{venueName ?? "Conversation"}</h2>
          <p className="text-sm text-zinc-400">
            {messages.length} message{messages.length !== 1 && "s"}
          </p>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <MessagesSkeleton />
        ) : messages.length === 0 ? (
          <EmptyMessages />
        ) : (
          <MessageList messages={messages} currentUserId={user?._id} />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className={cn(
              "flex-1 px-4 py-3 resize-none",
              "bg-night-tertiary border border-zinc-800",
              "text-white placeholder-zinc-500",
              "focus:border-lime outline-none",
              "max-h-32"
            )}
            style={{
              minHeight: "48px",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className={cn(
              "px-4 py-3 font-bold transition-colors",
              newMessage.trim() && !isSending
                ? "bg-lime text-night hover:bg-lime/90"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            )}
          >
            {isSending ? (
              <svg
                className="w-5 h-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
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
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

/**
 * Message list with grouping by sender.
 */
function MessageList({
  messages,
  currentUserId,
}: {
  messages: Message[];
  currentUserId?: string;
}) {
  // Group consecutive messages from the same sender
  const groupedMessages = groupMessages(messages);

  return (
    <div className="space-y-4">
      {groupedMessages.map((group, groupIndex) => {
        const isOwn = group[0].sender?._id === currentUserId;

        return (
          <div
            key={groupIndex}
            className={cn(
              "flex flex-col gap-1",
              isOwn ? "items-end" : "items-start"
            )}
          >
            {/* Sender name (only for received messages, first in group) */}
            {!isOwn && group[0].sender && (
              <span className="text-xs text-zinc-500 px-3">
                {group[0].sender.name}
              </span>
            )}

            {/* Messages in group */}
            {group.map((message, messageIndex) => (
              <MessageBubble
                key={message._id}
                message={message}
                isOwn={isOwn}
                isFirst={messageIndex === 0}
                isLast={messageIndex === group.length - 1}
              />
            ))}

            {/* Timestamp (only after last message in group) */}
            <span className="text-xs text-zinc-500 px-3">
              {getRelativeTime(group[group.length - 1].timestamp)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Individual message bubble.
 */
function MessageBubble({
  message,
  isOwn,
  isFirst,
  isLast,
}: {
  message: Message;
  isOwn: boolean;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div
      className={cn(
        "max-w-[80%] px-4 py-2 whitespace-pre-wrap break-words",
        isOwn ? "bg-lime text-night" : "bg-night-tertiary text-white",
        // Rounded corners based on position in group
        isOwn
          ? cn(
              isFirst && "rounded-t-2xl rounded-tl-2xl",
              isLast && "rounded-b-2xl rounded-bl-2xl",
              !isFirst && !isLast && "rounded-l-md",
              isFirst && isLast && "rounded-2xl"
            )
          : cn(
              isFirst && "rounded-t-2xl rounded-tr-2xl",
              isLast && "rounded-b-2xl rounded-br-2xl",
              !isFirst && !isLast && "rounded-r-md",
              isFirst && isLast && "rounded-2xl"
            )
      )}
    >
      {message.content}
    </div>
  );
}

/**
 * Group consecutive messages from the same sender.
 */
function groupMessages(messages: Message[]): Message[][] {
  const groups: Message[][] = [];
  let currentGroup: Message[] = [];
  let currentSenderId: string | undefined;

  for (const message of messages) {
    const senderId = message.sender?._id;

    if (senderId === currentSenderId) {
      currentGroup.push(message);
    } else {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }
      currentGroup = [message];
      currentSenderId = senderId;
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Empty state for no messages.
 */
function EmptyMessages() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
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
      <p className="text-zinc-400">
        No messages yet. Start the conversation!
      </p>
    </div>
  );
}

/**
 * Skeleton loader for messages.
 */
function MessagesSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Received message */}
      <div className="flex flex-col items-start gap-1">
        <div className="h-3 w-20 bg-zinc-800 rounded" />
        <div className="h-10 w-48 bg-zinc-800 rounded-2xl" />
        <div className="h-8 w-64 bg-zinc-800 rounded-2xl" />
      </div>

      {/* Sent message */}
      <div className="flex flex-col items-end gap-1">
        <div className="h-8 w-56 bg-zinc-800 rounded-2xl" />
        <div className="h-3 w-16 bg-zinc-800 rounded" />
      </div>

      {/* Another received */}
      <div className="flex flex-col items-start gap-1">
        <div className="h-3 w-20 bg-zinc-800 rounded" />
        <div className="h-16 w-72 bg-zinc-800 rounded-2xl" />
      </div>
    </div>
  );
}

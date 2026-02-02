/**
 * Conversation List Component
 *
 * Displays a list of band-venue messaging conversations.
 * Features real-time updates for new messages and unread counts.
 *
 * This component is designed for the musician dashboard to show
 * all conversations with venues.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useBandConversations } from "@/hooks/useMessages";
import { getRelativeTime } from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../../../convex/_generated/dataModel";

/**
 * Conversation data structure returned by the API.
 */
interface Conversation {
  _id: Id<"conversations">;
  lastMessageAt: number;
  lastMessagePreview?: string;
  unreadCount: number;
  venue?: {
    _id: Id<"venues">;
    name: string;
    city: string;
    images?: string[];
  } | null;
}

/**
 * Main conversation list component.
 * Shows all conversations for the current musician's band.
 *
 * @example
 * // In messages page
 * export default function MessagesPage() {
 *   return <ConversationList />;
 * }
 *
 * @example
 * // With selected conversation callback
 * <ConversationList
 *   selectedId={selectedConversation}
 *   onSelect={(id) => setSelectedConversation(id)}
 * />
 */
export function ConversationList({
  selectedId,
  onSelect,
}: {
  selectedId?: Id<"conversations">;
  onSelect?: (id: Id<"conversations">) => void;
}) {
  const { conversations, unreadCount, isLoading } = useBandConversations();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div>
          <h2 className="text-lg font-bold text-white">Messages</h2>
          {unreadCount > 0 && (
            <p className="text-sm text-zinc-400">
              {unreadCount} unread message{unreadCount !== 1 && "s"}
            </p>
          )}
        </div>

        {/* New conversation button (if needed) */}
        <button
          className="p-2 text-zinc-400 hover:text-lime transition-colors"
          title="New conversation"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <ConversationListSkeleton />
        ) : conversations.length === 0 ? (
          <EmptyConversations />
        ) : (
          <ul className="divide-y divide-zinc-800">
            {conversations.map((conversation) => (
              <ConversationItem
                key={conversation._id}
                conversation={conversation}
                isSelected={selectedId === conversation._id}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * Individual conversation list item.
 */
function ConversationItem({
  conversation,
  isSelected,
  onSelect,
}: {
  conversation: Conversation;
  isSelected: boolean;
  onSelect?: (id: Id<"conversations">) => void;
}) {
  const handleClick = () => {
    onSelect?.(conversation._id);
  };

  // Component can be either a link or a button depending on usage
  const Wrapper = onSelect ? "button" : Link;
  const wrapperProps = onSelect
    ? { onClick: handleClick, type: "button" as const }
    : { href: `/messages/${conversation._id}` };

  return (
    <li>
      <Wrapper
        {...wrapperProps}
        className={cn(
          "flex items-center gap-4 p-4 w-full text-left",
          "hover:bg-night-tertiary transition-colors",
          isSelected && "bg-night-tertiary border-l-2 border-lime"
        )}
      >
        {/* Venue Avatar */}
        <div className="flex-shrink-0">
          {conversation.venue?.images?.[0] ? (
            <img
              src={conversation.venue.images[0]}
              alt={conversation.venue.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center">
              <span className="text-lg">🏢</span>
            </div>
          )}
        </div>

        {/* Conversation Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3
              className={cn(
                "font-medium truncate",
                conversation.unreadCount > 0 ? "text-white" : "text-zinc-300"
              )}
            >
              {conversation.venue?.name ?? "Unknown Venue"}
            </h3>
            <span className="text-xs text-zinc-500 flex-shrink-0">
              {getRelativeTime(conversation.lastMessageAt)}
            </span>
          </div>

          {conversation.venue?.city && (
            <p className="text-sm text-zinc-500 truncate">
              {conversation.venue.city}
            </p>
          )}

          {conversation.lastMessagePreview && (
            <p
              className={cn(
                "text-sm truncate mt-1",
                conversation.unreadCount > 0
                  ? "text-zinc-300 font-medium"
                  : "text-zinc-500"
              )}
            >
              {conversation.lastMessagePreview}
            </p>
          )}
        </div>

        {/* Unread Badge */}
        {conversation.unreadCount > 0 && (
          <div className="flex-shrink-0">
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold bg-lime text-night rounded-full">
              {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
            </span>
          </div>
        )}
      </Wrapper>
    </li>
  );
}

/**
 * Empty state when no conversations exist.
 */
function EmptyConversations() {
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
      <p className="text-zinc-400 max-w-xs">
        When you apply to open dates or contact venues, your conversations will
        appear here.
      </p>
    </div>
  );
}

/**
 * Skeleton loader for conversation list.
 */
function ConversationListSkeleton() {
  return (
    <div className="divide-y divide-zinc-800">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
          <div className="w-12 h-12 rounded-lg bg-zinc-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-zinc-800 rounded w-3/4" />
            <div className="h-3 bg-zinc-800 rounded w-1/2" />
            <div className="h-3 bg-zinc-800 rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Split-pane layout for desktop messaging.
 * Shows list on left, conversation on right.
 */
export function MessagingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedId, setSelectedId] = useState<Id<"conversations"> | undefined>();

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Conversation List - Fixed width on desktop */}
      <div className="w-full md:w-80 lg:w-96 border-r border-zinc-800 flex-shrink-0">
        <ConversationList selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      {/* Message Thread - Takes remaining space */}
      <div className="hidden md:flex flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}

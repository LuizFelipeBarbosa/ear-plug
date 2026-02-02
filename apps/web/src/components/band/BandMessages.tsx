"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Send, ArrowLeft, Music, Users } from "lucide-react";
import { useBandConversations, useConversation } from "@/hooks/useMessages";
import { useBookingConversations } from "@/hooks/useBookings";
import { getRelativeTime } from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../../convex/_generated/dataModel";

type ConversationType = "venue" | "booking";

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
  const { conversations, isLoading: venueLoading } = useBandConversations();
  const { bandConversations: bookingConversations, isLoading: bookingLoading } = useBookingConversations();
  const [activeTab, setActiveTab] = useState<"all" | "venues" | "bookings">("all");

  const isLoading = venueLoading || bookingLoading;

  // Combine and sort all conversations
  const allConversations = [
    ...conversations.map((conv) => ({
      ...conv,
      type: "venue" as ConversationType,
      name: conv.venue?.name || "Unknown Venue",
      image: conv.venue?.images?.[0],
      linkTo: null as string | null,
    })),
    ...bookingConversations.map((conv: any) => ({
      ...conv,
      type: "booking" as ConversationType,
      name: conv.fan?.name || "Fan",
      image: null,
      linkTo: `/bookings/${conv.bookingId}`,
      lastMessageAt: conv.lastMessageAt || conv._creationTime,
      lastMessagePreview: conv.lastMessage?.content || "New booking request",
      unreadCount: conv.unreadCount || 0,
    })),
  ].sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));

  const filteredConversations = allConversations.filter((conv) => {
    if (activeTab === "all") return true;
    if (activeTab === "venues") return conv.type === "venue";
    if (activeTab === "bookings") return conv.type === "booking";
    return true;
  });

  const venueCount = conversations.length;
  const bookingCount = bookingConversations.length;

  return (
    <div className="min-h-screen bg-night pb-24">
      {/* Header - Brutalist */}
      <header className="bg-night-secondary border-b-2 border-lime/20 p-4">
        <h1 className="text-2xl font-bold text-white uppercase tracking-tight">
          Messages
        </h1>
      </header>

      {/* Tabs - Brutalist */}
      <div className="flex border-b-2 border-zinc-800">
        <button
          onClick={() => setActiveTab("all")}
          className={cn(
            "flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2",
            activeTab === "all"
              ? "text-lime border-lime"
              : "text-zinc-500 border-transparent hover:text-white"
          )}
        >
          All ({allConversations.length})
        </button>
        <button
          onClick={() => setActiveTab("venues")}
          className={cn(
            "flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2",
            activeTab === "venues"
              ? "text-lime border-lime"
              : "text-zinc-500 border-transparent hover:text-white"
          )}
        >
          Venues ({venueCount})
        </button>
        <button
          onClick={() => setActiveTab("bookings")}
          className={cn(
            "flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2",
            activeTab === "bookings"
              ? "text-lime border-lime"
              : "text-zinc-500 border-transparent hover:text-white"
          )}
        >
          Bookings ({bookingCount})
        </button>
      </div>

      {/* Conversations List */}
      <div className="divide-y-2 divide-zinc-800">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 bg-night-tertiary border-2 border-zinc-800 animate-shimmer" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-night-tertiary border border-zinc-800 w-1/3 animate-shimmer" />
                <div className="h-3 bg-night-tertiary border border-zinc-800 w-2/3 animate-shimmer" />
              </div>
            </div>
          ))
        ) : filteredConversations.length > 0 ? (
          filteredConversations.map((conv) => {
            const content = (
              <div
                className={cn(
                  "w-full p-4 flex items-center gap-3 text-left bg-night-tertiary border-l-2 border-transparent hover:border-lime/30 transition-all",
                  conv.unreadCount > 0 && "border-l-lime"
                )}
              >
                {/* Avatar */}
                <div className="w-12 h-12 overflow-hidden bg-night-secondary border-2 border-zinc-800 flex-shrink-0 flex items-center justify-center">
                  {conv.type === "venue" && conv.image ? (
                    <Image
                      src={conv.image}
                      alt={conv.name}
                      width={48}
                      height={48}
                      className="object-cover"
                    />
                  ) : conv.type === "venue" ? (
                    <Music className="w-6 h-6 text-zinc-600" />
                  ) : (
                    <Users className="w-6 h-6 text-violet" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3
                        className={cn(
                          "font-bold text-white uppercase tracking-tight text-sm truncate",
                          conv.unreadCount > 0 && "text-lime"
                        )}
                      >
                        {conv.name}
                      </h3>
                      {conv.type === "booking" && (
                        <span className="px-1.5 py-0.5 bg-violet/20 text-violet text-[10px] font-bold uppercase tracking-wider border border-violet/30">
                          Booking
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider flex-shrink-0">
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

                {/* Unread Badge - Brutalist */}
                {conv.unreadCount > 0 && (
                  <span className="min-w-[24px] h-6 bg-lime text-night text-xs font-bold flex items-center justify-center px-1 border border-night">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            );

            // Booking conversations link to booking detail, venue conversations use internal state
            if (conv.type === "booking" && conv.linkTo) {
              return (
                <Link key={conv._id} href={conv.linkTo}>
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={conv._id}
                onClick={() => conv.type === "venue" && onSelect(conv._id as Id<"conversations">)}
                className="w-full"
              >
                {content}
              </button>
            );
          })
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
    <div className="min-h-screen flex flex-col bg-night pb-24">
      {/* Header - Brutalist */}
      <header className="bg-night-secondary border-b-2 border-lime/20 p-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 -ml-2 flex items-center justify-center hover:bg-night-tertiary border-2 border-zinc-800 hover:border-lime/30 transition-colors touch-target"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-400" />
        </button>
        <h1 className="text-lg font-bold text-white uppercase tracking-tight">
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
                  "max-w-[70%] p-3 animate-shimmer border-2 border-zinc-800",
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
          <p className="text-center text-zinc-500 py-8 uppercase text-xs font-bold tracking-wider">
            No messages yet. Start the conversation!
          </p>
        )}
      </div>

      {/* Input - Brutalist */}
      <div className="bg-night-secondary border-t-2 border-lime/20 p-4">
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
            "text-xs mt-1 font-bold uppercase tracking-wider",
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
      <h3 className="text-lg font-bold text-white uppercase tracking-tight mb-2">
        No conversations yet
      </h3>
      <p className="text-zinc-500 max-w-[250px]">
        Apply to open dates to start conversations with venues
      </p>
    </div>
  );
}

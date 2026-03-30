"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import {
  MessageCircle,
  Send,
  ArrowLeft,
  Check,
  X,
  Mail,
  UserPlus,
  MapPin,
  Calendar,
  Clock,
  Music,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBandConversations, useConversation } from "@/hooks/useMessages";
import { panelFade, presenceSyncNoInitial } from "@/lib/motion/presets";
import {
  formatEventTime,
  formatFullDate,
  getRelativeTime,
} from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../../convex/_generated/dataModel";

export function BandMessagesView() {
  const [selectedConversation, setSelectedConversation] = useState<Id<"conversations"> | null>(null);

  return (
    <AnimatePresence {...presenceSyncNoInitial}>
      {selectedConversation ? (
        <ConversationView
          key="conversation"
          conversationId={selectedConversation}
          onBack={() => setSelectedConversation(null)}
        />
      ) : (
        <ConversationsList key="list" onSelect={setSelectedConversation} />
      )}
    </AnimatePresence>
  );
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
    action: "accept" | "decline"
  ) => {
    setActiveInviteId(inviteId);
    try {
      await respondToCohostInvite({ inviteId, action });
    } finally {
      setActiveInviteId(null);
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-background overflow-x-hidden">
      {/* Header Background */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-band/10 via-band/5 to-transparent h-48" />
      </div>

      {/* Header */}
      <header className="relative px-4 pt-4 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-band/10 border border-band/20 rounded-xl flex items-center justify-center">
              <Mail className="w-5 h-5 text-band" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Connect with venues and manage co-host invites
          </p>
        </motion.div>
      </header>

      <main className="px-4 space-y-6">
        {/* Co-host Invites Section */}
        {pendingCohostInvites.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-band" />
              <h2 className="text-sm font-semibold text-foreground">Co-host Invites</h2>
              <span className="ml-auto text-xs font-medium px-2 py-0.5 bg-band/10 text-band rounded-full">
                {pendingCohostInvites.length}
              </span>
            </div>
            <div className="space-y-3">
              {pendingCohostInvites.map((invite) => (
                <div
                  key={invite._id}
                  className="bg-card border border-band/20 rounded-2xl p-4 shadow-sm"
                >
                  {/* Event Info */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-band/20 to-fan/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Music className="w-6 h-6 text-band" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {invite.event?.title?.trim() || "Untitled Gig"}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {typeof invite.event?.dateTime === "number" && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatFullDate(invite.event.dateTime)}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {invite.event?.venue?.name ?? "Venue TBD"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Host: {invite.hostBand?.name ?? "Unknown Band"}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"

                      onClick={() => handleInviteAction(invite._id, "accept")}
                      disabled={activeInviteId === invite._id || !invite.canRespond}
                      className={cn(
                        "flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors transition-shadow flex items-center justify-center gap-2",
                        activeInviteId === invite._id || !invite.canRespond
                          ? "bg-muted text-muted-foreground cursor-not-allowed"
                          : "bg-band text-white hover:bg-band/90 shadow-lg shadow-band/25"
                      )}
                    >
                      <Check className="w-4 h-4" />
                      Accept
                    </button>
                    <button
                      type="button"

                      onClick={() => handleInviteAction(invite._id, "decline")}
                      disabled={activeInviteId === invite._id || !invite.canRespond}
                      className={cn(
                        "flex-1 py-2.5 px-4 rounded-xl text-sm font-medium border transition-colors transition-shadow flex items-center justify-center gap-2",
                        activeInviteId === invite._id || !invite.canRespond
                          ? "bg-muted border-border text-muted-foreground cursor-not-allowed"
                          : "bg-card border-border text-muted-foreground hover:border-red-500/30 hover:text-red-500"
                      )}
                    >
                      <X className="w-4 h-4" />
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Conversations List */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Conversations</h2>
            {conversations.length > 0 && (
              <span className="ml-auto text-xs font-medium px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                {conversations.length}
              </span>
            )}
          </div>

          <motion.div variants={panelFade} initial="hidden" animate="visible" className="space-y-2">
            {isLoading ? (
              // Loading Skeleton
              [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-4 flex items-center gap-3 bg-card border border-border rounded-2xl"
                >
                  <div className="w-12 h-12 bg-muted animate-shimmer rounded-xl" />
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
                    "w-full p-4 flex items-center gap-3 text-left bg-card border rounded-2xl transition-colors transition-shadow",
                    conv.unreadCount > 0
                      ? "border-band/30 shadow-sm"
                      : "border-border hover:border-band/20"
                  )}
                >
                  {/* Venue Avatar */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-band/20 to-fan/20">
                    {conv.venue?.images?.[0] ? (
                      <Image
                        src={conv.venue.images[0]}
                        alt={conv.venue.name}
                        width={48}
                        height={48}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-band/50" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        className={cn(
                          "font-semibold text-sm truncate",
                          conv.unreadCount > 0 ? "text-band" : "text-foreground"
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
                          : "text-muted-foreground"
                      )}
                    >
                      {conv.lastMessagePreview || "No messages yet"}
                    </p>
                  </div>

                  {/* Unread Badge */}
                  {conv.unreadCount > 0 && (
                    <span className="min-w-[24px] h-6 bg-band text-white text-xs font-semibold flex items-center justify-center px-2 rounded-full">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              ))
            ) : pendingCohostInvites.length > 0 ? (
              <div className="p-4 text-sm text-muted-foreground bg-muted/50 border border-dashed border-border rounded-2xl text-center">
                No venue conversations yet.
              </div>
            ) : (
              <EmptyState />
            )}
          </motion.div>
        </section>
      </main>
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
  const { messages, isLoading, sendMessage, markAsRead } = useConversation(conversationId);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mark as read when viewing
  useEffect(() => {
    markAsRead();
  }, [markAsRead]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  // Get venue info from first message sender if available
  const venueName = "Venue";
  const venueImage = null;

  return (
    <motion.div
      variants={panelFade}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="min-h-screen flex flex-col bg-background pb-24"
    >
      {/* Header */}
      <header className="sticky top-0 z-20 bg-card/95 backdrop-blur-xl border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <button

            onClick={onBack}
            className="p-2.5 hover:bg-muted border border-border hover:border-band/30 rounded-xl transition-colors touch-target"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Venue Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-band/20 to-fan/20">
              {venueImage ? (
                <Image
                  src={venueImage}
                  alt={venueName}
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-band/50" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-foreground truncate">{venueName}</h1>
              <p className="text-xs text-muted-foreground">Active now</p>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28 space-y-4 sm:pb-24">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[84%] p-4 animate-shimmer rounded-2xl sm:max-w-[75%]",
                  i % 2 === 0 ? "ml-auto bg-band/20" : "bg-muted"
                )}
              >
                <div className="h-4 bg-muted w-full rounded" />
              </div>
            ))}
          </div>
        ) : messages.length > 0 ? (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg._id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-band/10 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-band" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">Start the conversation</h3>
            <p className="text-sm text-muted-foreground max-w-[250px]">
              Send a message to connect with this venue
            </p>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="sticky bottom-0 border-t border-border bg-card/95 px-4 pb-4 pt-3 backdrop-blur-xl safe-area-inset-bottom">
        <div className="flex items-end gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-band/50 focus:ring-2 focus:ring-band/10 transition-colors transition-shadow resize-none min-h-[48px] max-h-[120px]"
            style={{ height: "auto" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = target.scrollHeight + "px";
            }}
          />
          <button

            onClick={handleSend}
            disabled={!newMessage.trim()}
            className={cn(
              "p-3 rounded-xl transition-colors transition-shadow touch-target flex items-center justify-center",
              newMessage.trim()
                ? "bg-band text-white hover:bg-band/90 shadow-lg shadow-band/25"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function MessageBubble({ message }: { message: any }) {
  // Determine if message is from band (own) or venue (other)
  const isOwn = message.senderRole === "band";

  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[84%] px-4 py-3 rounded-2xl sm:max-w-[75%]",
          isOwn
            ? "bg-band text-white rounded-br-md"
            : "bg-card border border-border text-foreground rounded-bl-md"
        )}
      >
        <p className="text-sm leading-relaxed">{message.content}</p>
        <p
          className={cn(
            "text-[10px] mt-1.5",
            isOwn ? "text-white/70" : "text-muted-foreground"
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
      <div className="w-20 h-20 bg-gradient-to-br from-band/10 to-fan/10 border border-band/20 rounded-2xl flex items-center justify-center mb-4">
        <MessageCircle className="w-10 h-10 text-band" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">No conversations yet</h3>
      <p className="text-sm text-muted-foreground max-w-[280px]">
        Apply to open dates to start conversations with venues and book your next gig
      </p>
    </div>
  );
}

import {
  ActionButton,
  AppScreen,
  Avatar,
  EmptyState,
  HeroHeader,
  IconButton,
  LoadingPanel,
  MiniBadge,
  SectionCard,
  SectionTitle,
} from "@/components/ui/AppPrimitives";
import { useConversation, useBandConversations } from "@/hooks/useMessages";
import { useCurrentUser } from "@/hooks/useUser";
import { formatFullDate, getRelativeTime } from "@ear-plug/shared/constants";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ArrowLeft, Send } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";

export function BandMessagesScreen() {
  const [selectedConversationId, setSelectedConversationId] = useState<Id<"conversations"> | null>(null);

  if (selectedConversationId) {
    return (
      <ConversationThread
        conversationId={selectedConversationId}
        onBack={() => setSelectedConversationId(null)}
      />
    );
  }

  return <ConversationInbox onSelect={setSelectedConversationId} />;
}

function ConversationInbox({ onSelect }: { onSelect: (id: Id<"conversations">) => void }) {
  const { conversations, pendingCohostInvites, respondToCohostInvite, isLoading } = useBandConversations();
  const [respondingInviteId, setRespondingInviteId] = useState<string | null>(null);

  return (
    <AppScreen
      scroll
      header={
        <HeroHeader
          title="Inbox"
          subtitle="Venue conversations and co-host invites, brought up to the web app’s hierarchy."
          eyebrow="Band Workspace"
          tone="band"
        >
          <View className="flex-row gap-2">
            <SectionCard tone="band">
              <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-violet-700">Unread</Text>
              <Text className="mt-2 text-3xl font-bold text-slate-950">
                {conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0)}
              </Text>
            </SectionCard>
            <SectionCard tone="warning">
              <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-amber-700">Invites</Text>
              <Text className="mt-2 text-3xl font-bold text-slate-950">{pendingCohostInvites.length}</Text>
            </SectionCard>
          </View>
        </HeroHeader>
      }
    >
      {pendingCohostInvites.length > 0 ? (
        <View className="mb-5">
          <SectionTitle title="Co-host Invites" subtitle="Accept or decline event invites without leaving the inbox." />
          <View className="gap-3">
            {pendingCohostInvites.map((invite) => (
              <SectionCard key={invite._id} tone="band">
                <View className="flex-row items-start gap-3">
                  <Avatar label={invite.hostBand?.name || "Band"} size={52} tone="band" />
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-slate-900">{invite.event?.title || "Untitled Gig"}</Text>
                    <Text className="mt-1 text-xs text-slate-500">
                      Host: {invite.hostBand?.name || "Unknown Band"}
                    </Text>
                    <Text className="mt-1 text-xs text-slate-500">
                      {typeof invite.event?.dateTime === "number" ? formatFullDate(invite.event.dateTime) : "Date TBD"}
                      {" • "}
                      {invite.event?.venue?.name ?? "Venue TBD"}
                    </Text>
                  </View>
                </View>

                <View className="mt-4 flex-row gap-2">
                  <View className="flex-1">
                    <ActionButton
                      label={respondingInviteId === invite._id ? "Working..." : "Accept"}
                      tone="band"
                      disabled={respondingInviteId === invite._id || !invite.canRespond}
                      onPress={async () => {
                        setRespondingInviteId(invite._id);
                        try {
                          await respondToCohostInvite({ inviteId: invite._id, action: "accept" });
                        } finally {
                          setRespondingInviteId(null);
                        }
                      }}
                    />
                  </View>
                  <View className="flex-1">
                    <ActionButton
                      label="Decline"
                      variant="secondary"
                      disabled={respondingInviteId === invite._id || !invite.canRespond}
                      onPress={async () => {
                        setRespondingInviteId(invite._id);
                        try {
                          await respondToCohostInvite({ inviteId: invite._id, action: "decline" });
                        } finally {
                          setRespondingInviteId(null);
                        }
                      }}
                    />
                  </View>
                </View>
              </SectionCard>
            ))}
          </View>
        </View>
      ) : null}

      <SectionTitle title="Conversations" subtitle="Unread emphasis, venue identity, and recency match the web inbox." />
      {isLoading ? (
        <LoadingPanel label="Loading conversations..." tone="band" />
      ) : conversations.length > 0 ? (
        <View className="gap-3">
          {conversations.map((conversation) => (
            <Pressable key={conversation._id} onPress={() => onSelect(conversation._id)} className="active:opacity-70">
              <SectionCard tone={conversation.unreadCount > 0 ? "band" : "neutral"}>
                <View className="flex-row items-center gap-3">
                  <Avatar
                    uri={conversation.venue?.images?.[0]}
                    label={conversation.venue?.name || "Venue"}
                    size={56}
                    tone={conversation.unreadCount > 0 ? "band" : "neutral"}
                  />
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between gap-2">
                      <Text className="text-sm font-semibold text-slate-900">{conversation.venue?.name || "Unknown Venue"}</Text>
                      <Text className="text-xs text-slate-500">{getRelativeTime(conversation.lastMessageAt)}</Text>
                    </View>
                    <Text className="mt-1 text-xs text-slate-500">
                      {conversation.venue?.city || "Bay Area"} • {conversation.lastMessagePreview || "No messages yet"}
                    </Text>
                    {conversation.unreadCount > 0 ? (
                      <View className="mt-3">
                        <MiniBadge label={`${conversation.unreadCount} unread`} tone="band" />
                      </View>
                    ) : null}
                  </View>
                </View>
              </SectionCard>
            </Pressable>
          ))}
        </View>
      ) : (
        <EmptyState
          tone="band"
          title="No conversations yet"
          message="Venue threads will appear here as soon as your band starts messaging."
        />
      )}
    </AppScreen>
  );
}

function ConversationThread({
  conversationId,
  onBack,
}: {
  conversationId: Id<"conversations">;
  onBack: () => void;
}) {
  const { user } = useCurrentUser();
  const { messages, sendMessage, markAsRead, isLoading } = useConversation(conversationId);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void markAsRead();
  }, [markAsRead]);

  const conversationTitle = useMemo(() => {
    const firstSender = messages.find((message) => message.sender)?.sender?.name;
    return firstSender ? `Thread with ${firstSender}` : "Conversation";
  }, [messages]);

  return (
    <AppScreen
      footer={
        <View className="border-t border-slate-200 bg-white px-4 pb-6 pt-3">
          <View className="flex-row items-end gap-2">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Type a message"
              placeholderTextColor="#94a3b8"
              multiline
              className="max-h-28 flex-1 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
            />
            <IconButton
              icon={<Send size={18} color="#ffffff" />}
              onPress={async () => {
                if (!draft.trim() || pending) return;
                setPending(true);
                try {
                  await sendMessage(draft.trim());
                  setDraft("");
                } finally {
                  setPending(false);
                }
              }}
              tone="band"
              disabled={!draft.trim() || pending}
              accessibilityLabel="Send message"
            />
          </View>
        </View>
      }
      header={
        <HeroHeader
          title="Conversation"
          subtitle={conversationTitle}
          eyebrow="Band Workspace"
          tone="band"
          action={
            <IconButton
              icon={<ArrowLeft size={18} color="#64748b" />}
              onPress={onBack}
              variant="secondary"
              accessibilityLabel="Go back"
            />
          }
        />
      }
    >
      {isLoading ? (
        <LoadingPanel label="Loading messages..." tone="band" />
      ) : messages.length > 0 ? (
        <FlatList
          data={messages}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => {
            const isOwn = user?._id === item.sender?._id;
            return (
              <View className={`mb-3 ${isOwn ? "items-end" : "items-start"}`}>
                <View className={`max-w-[86%] rounded-[24px] px-4 py-3 ${isOwn ? "bg-violet-600" : "border border-slate-200 bg-white"}`}>
                  <Text className={`text-xs font-semibold ${isOwn ? "text-violet-100" : "text-slate-500"}`}>
                    {item.sender?.name || "Unknown"}
                  </Text>
                  <Text className={`mt-1 text-sm leading-6 ${isOwn ? "text-white" : "text-slate-800"}`}>
                    {item.content}
                  </Text>
                  <Text className={`mt-2 text-[11px] ${isOwn ? "text-violet-100" : "text-slate-400"}`}>
                    {getRelativeTime(item.timestamp)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      ) : (
        <EmptyState
          tone="band"
          title="No messages yet"
          message="Start the thread by sending the first message below."
        />
      )}
    </AppScreen>
  );
}

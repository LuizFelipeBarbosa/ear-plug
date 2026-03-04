import { useBandConversations, useConversation } from "@/hooks/useMessages";
import { getRelativeTime } from "@ear-plug/shared/constants";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Text, TextInput, TouchableOpacity, View } from "react-native";

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
    <View className="flex-1 bg-white">
      <View className="px-4 pt-4 pb-3 border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-900">Inbox</Text>
      </View>

      {pendingCohostInvites.length > 0 ? (
        <View className="px-4 py-3 border-b border-gray-100">
          <Text className="text-sm font-semibold text-gray-900">Pending Co-host Invites</Text>
          {pendingCohostInvites.map((invite) => (
            <View key={invite._id} className="mt-2 rounded-xl border border-violet-200 bg-violet-50 p-3">
              <Text className="font-semibold text-gray-900">{invite.event?.title || "Untitled Gig"}</Text>
              <Text className="text-xs text-gray-600 mt-1">Host: {invite.hostBand?.name || "Unknown Band"}</Text>
              <View className="mt-2 flex-row gap-2">
                <TouchableOpacity
                  onPress={async () => {
                    setRespondingInviteId(invite._id);
                    try {
                      await respondToCohostInvite({ inviteId: invite._id, action: "accept" });
                    } finally {
                      setRespondingInviteId(null);
                    }
                  }}
                  className="flex-1 rounded-lg bg-violet-600 py-2"
                  disabled={respondingInviteId === invite._id || !invite.canRespond}
                >
                  <Text className="text-center text-xs font-semibold text-white">
                    {respondingInviteId === invite._id ? "Working..." : "Accept"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={async () => {
                    setRespondingInviteId(invite._id);
                    try {
                      await respondToCohostInvite({ inviteId: invite._id, action: "decline" });
                    } finally {
                      setRespondingInviteId(null);
                    }
                  }}
                  className="flex-1 rounded-lg border border-red-300 py-2"
                  disabled={respondingInviteId === invite._id || !invite.canRespond}
                >
                  <Text className="text-center text-xs font-semibold text-red-700">Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Loading conversations...</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => onSelect(item._id)}
              className={`mb-2 rounded-xl border p-4 ${item.unreadCount > 0 ? "border-violet-300 bg-violet-50" : "border-gray-200"}`}
            >
              <View className="flex-row items-center justify-between">
                <Text className="font-semibold text-gray-900">{item.venue?.name || "Unknown Venue"}</Text>
                <Text className="text-xs text-gray-500">{getRelativeTime(item.lastMessageAt)}</Text>
              </View>
              <Text className="text-sm text-gray-600 mt-1" numberOfLines={1}>
                {item.lastMessagePreview || "No messages yet"}
              </Text>
              {item.unreadCount > 0 ? (
                <Text className="mt-2 text-xs font-semibold text-violet-700">{item.unreadCount} unread</Text>
              ) : null}
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <View className="py-16 items-center">
              <Text className="text-gray-500">No conversations yet.</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

function ConversationThread({
  conversationId,
  onBack,
}: {
  conversationId: Id<"conversations">;
  onBack: () => void;
}) {
  const { messages, sendMessage, markAsRead, isLoading } = useConversation(conversationId);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void markAsRead();
  }, [markAsRead]);

  const groupedMessages = useMemo(() => messages, [messages]);

  return (
    <View className="flex-1 bg-white">
      <View className="px-4 pt-4 pb-3 border-b border-gray-200 flex-row items-center justify-between">
        <TouchableOpacity onPress={onBack} className="rounded-lg border border-gray-200 px-3 py-1.5">
          <Text className="text-xs font-semibold text-gray-700">Back</Text>
        </TouchableOpacity>
        <Text className="text-base font-semibold text-gray-900">Conversation</Text>
        <View style={{ width: 52 }} />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Loading messages...</Text>
        </View>
      ) : (
        <FlatList
          className="flex-1"
          data={groupedMessages}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <View className="mb-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <Text className="text-xs font-semibold text-gray-700">{item.sender?.name || "Unknown"}</Text>
              <Text className="text-sm text-gray-800 mt-1">{item.content}</Text>
              <Text className="text-[10px] text-gray-500 mt-1">{getRelativeTime(item.timestamp)}</Text>
            </View>
          )}
        />
      )}

      <View className="p-3 border-t border-gray-200">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a message"
          className="rounded-xl border border-gray-200 px-3 py-2 text-gray-900"
        />
        <TouchableOpacity
          onPress={async () => {
            if (!draft.trim() || pending) return;
            setPending(true);
            try {
              await sendMessage(draft);
              setDraft("");
            } finally {
              setPending(false);
            }
          }}
          className="mt-2 rounded-xl bg-violet-600 py-2.5"
        >
          <Text className="text-center font-semibold text-white">{pending ? "Sending..." : "Send"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

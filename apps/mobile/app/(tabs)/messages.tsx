import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from "react-native";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Bell, MessageCircle } from "lucide-react-native";

export default function MessagesScreen() {
  const user = useQuery(api.users.getCurrentUser);
  const notifications = useQuery(api.notifications.list, { limit: 20 });
  const conversations = useQuery(api.messages.getBandConversations);
  
  const isFan = user?.role === "fan";

  if (!user) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <View className="w-12 h-12 rounded-full bg-primary-500 animate-pulse" />
      </SafeAreaView>
    );
  }

  if (isFan) {
    // Notifications View
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="p-4 border-b border-gray-200">
          <Text className="text-2xl font-bold text-gray-900">Notifications</Text>
        </View>

        <ScrollView className="flex-1 p-4">
          {notifications && notifications.length > 0 ? (
            notifications.map((notif) => (
              <TouchableOpacity
                key={notif._id}
                className={`p-4 rounded-xl mb-3 ${
                  notif.read ? "bg-white" : "bg-primary-50 border-l-4 border-primary-500"
                }`}
              >
                <Text className="font-medium text-gray-900">{notif.title}</Text>
                <Text className="text-sm text-gray-500 mt-1">{notif.content}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <View className="items-center justify-center py-16">
              <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
                <Bell size={32} color="#9ca3af" />
              </View>
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                No notifications yet
              </Text>
              <Text className="text-gray-500 text-center">
                We&apos;ll notify you about events, updates, and more
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Messages View for Musicians
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="p-4 border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-900">Messages</Text>
      </View>

      <ScrollView className="flex-1">
        {conversations && conversations.length > 0 ? (
          conversations.map((conv) => (
            <TouchableOpacity
              key={conv._id}
              className="p-4 border-b border-gray-100 flex-row items-center"
            >
              <View className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-accent-400" />
              <View className="flex-1 ml-3">
                <Text className="font-medium text-gray-900">
                  {conv.venue?.name || "Unknown Venue"}
                </Text>
                <Text className="text-sm text-gray-500" numberOfLines={1}>
                  {conv.lastMessagePreview || "No messages yet"}
                </Text>
              </View>
              {conv.unreadCount > 0 && (
                <View className="w-6 h-6 rounded-full bg-primary-500 items-center justify-center">
                  <Text className="text-white text-xs font-bold">
                    {conv.unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View className="items-center justify-center py-16">
            <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
              <MessageCircle size={32} color="#9ca3af" />
            </View>
            <Text className="text-lg font-semibold text-gray-900 mb-2">
              No conversations yet
            </Text>
            <Text className="text-gray-500 text-center px-8">
              Apply to open dates to start conversations with venues
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

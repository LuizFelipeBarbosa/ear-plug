import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from "react-native";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Calendar, Ticket, Heart } from "lucide-react-native";
import { useState } from "react";

export default function CalendarScreen() {
  const user = useQuery(api.users.getCurrentUser);
  const rsvps = useQuery(api.events.getUserRsvps);
  const likes = useQuery(api.events.getUserLikes);
  
  const [activeTab, setActiveTab] = useState<"rsvps" | "liked">("rsvps");
  const isFan = user?.role === "fan";

  if (!user) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <View className="w-12 h-12 rounded-full bg-primary-500 animate-pulse" />
      </SafeAreaView>
    );
  }

  const displayEvents = activeTab === "rsvps" ? rsvps : likes;

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="p-4 border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-900">
          {isFan ? "My Events" : "Shows & Availability"}
        </Text>
        
        {isFan && (
          <View className="flex-row mt-4">
            <TouchableOpacity
              onPress={() => setActiveTab("rsvps")}
              className={`flex-row items-center px-4 py-2 rounded-xl mr-2 ${
                activeTab === "rsvps" ? "bg-primary-500" : "bg-gray-100"
              }`}
            >
              <Ticket
                size={16}
                color={activeTab === "rsvps" ? "#fff" : "#6b7280"}
              />
              <Text
                className={`ml-2 font-medium ${
                  activeTab === "rsvps" ? "text-white" : "text-gray-600"
                }`}
              >
                RSVPs ({rsvps?.length || 0})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab("liked")}
              className={`flex-row items-center px-4 py-2 rounded-xl ${
                activeTab === "liked" ? "bg-primary-500" : "bg-gray-100"
              }`}
            >
              <Heart
                size={16}
                color={activeTab === "liked" ? "#fff" : "#6b7280"}
              />
              <Text
                className={`ml-2 font-medium ${
                  activeTab === "liked" ? "text-white" : "text-gray-600"
                }`}
              >
                Liked ({likes?.length || 0})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Events List */}
      <ScrollView className="flex-1 p-4">
        {displayEvents && displayEvents.length > 0 ? (
          displayEvents.map((event) => (
            <TouchableOpacity
              key={event._id}
              className="bg-gray-50 rounded-xl p-4 mb-3"
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="font-semibold text-gray-900">
                    {event.title}
                  </Text>
                  <Text className="text-sm text-gray-500 mt-1">
                    {event.venue?.name}
                  </Text>
                  <Text className="text-sm text-primary-600 mt-1">
                    {new Date(event.dateTime).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View className="items-center justify-center py-16">
            <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
              <Calendar size={32} color="#9ca3af" />
            </View>
            <Text className="text-lg font-semibold text-gray-900 mb-2">
              {activeTab === "rsvps" ? "No RSVPs yet" : "No liked events"}
            </Text>
            <Text className="text-gray-500 text-center">
              {activeTab === "rsvps"
                ? "RSVP to events to see them here"
                : "Like events to save them for later"}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

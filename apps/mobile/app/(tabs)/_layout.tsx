import { Tabs } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Map,
  Calendar,
  Bell,
  User,
  LayoutDashboard,
  MessageCircle,
} from "lucide-react-native";

export default function TabsLayout() {
  const user = useQuery(api.users.getCurrentUser);
  const isFan = user?.role === "fan";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#7c3aed",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          paddingTop: 8,
          paddingBottom: 8,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isFan ? "Discover" : "Dashboard",
          tabBarIcon: ({ color, size }) =>
            isFan ? (
              <Map size={size} color={color} />
            ) : (
              <LayoutDashboard size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: isFan ? "My Events" : "Shows",
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: isFan ? "Notifications" : "Messages",
          tabBarIcon: ({ color, size }) =>
            isFan ? (
              <Bell size={size} color={color} />
            ) : (
              <MessageCircle size={size} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

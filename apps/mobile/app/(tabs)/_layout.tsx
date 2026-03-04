import { useProfileContext } from "@/context/ProfileContext";
import { useBandConversations } from "@/hooks/useMessages";
import { useNotifications } from "@/hooks/useNotifications";
import { Tabs } from "expo-router";
import {
  BarChart3,
  Bell,
  Calendar,
  LayoutDashboard,
  Map,
  MessageCircle,
  User,
} from "lucide-react-native";

export default function TabsLayout() {
  const { mode } = useProfileContext();
  const isFan = mode === "personal";
  const { unreadCount: notificationsUnread } = useNotifications();
  const { unreadCount: messagesUnread, pendingInviteCount } = useBandConversations();
  const inboxBadge = messagesUnread + pendingInviteCount;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isFan ? "#2563eb" : "#7c3aed",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          paddingTop: 8,
          paddingBottom: 8,
          height: 72,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isFan ? "Discover" : "Dashboard",
          tabBarIcon: ({ color, size }) =>
            isFan ? <Map size={size} color={color} /> : <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: isFan ? "Calendar" : "Shows",
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          href: isFan ? null : "/analytics",
          title: "Analytics",
          tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: isFan ? "Alerts" : "Inbox",
          tabBarBadge: isFan
            ? notificationsUnread > 0
              ? notificationsUnread > 99
                ? "99+"
                : notificationsUnread
              : undefined
            : inboxBadge > 0
              ? inboxBadge > 99
                ? "99+"
                : inboxBadge
              : undefined,
          tabBarIcon: ({ color, size }) =>
            isFan ? <Bell size={size} color={color} /> : <MessageCircle size={size} color={color} />,
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

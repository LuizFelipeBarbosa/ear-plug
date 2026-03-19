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
        tabBarInactiveTintColor: "#94a3b8",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 0,
          borderTopColor: "transparent",
          paddingTop: 10,
          paddingBottom: 10,
          height: 78,
          shadowColor: "#0f172a",
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.06,
          shadowRadius: 18,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
        tabBarBadgeStyle: {
          backgroundColor: isFan ? "#2563eb" : "#7c3aed",
          color: "#ffffff",
          fontSize: 10,
          fontWeight: "700",
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

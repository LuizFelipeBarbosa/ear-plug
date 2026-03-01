"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Map,
  Calendar,
  Bell,
  User,
  LayoutDashboard,
  MessageCircle,
  BarChart3,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/useUser";
import { useProfileContext } from "@/hooks/useProfileContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useBandConversations } from "@/hooks/useMessages";
import { cn } from "@/lib/utils";
interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}
export function BottomNav() {
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const { mode } = useProfileContext();
  const { unreadCount: notificationCount } = useNotifications();
  const { unreadCount: messageCount, pendingInviteCount } =
    useBandConversations();
  if (!user) return null;
  const fanNavItems: NavItem[] = [
    {
      href: "/home",
      label: "Discover",
      icon: <Map className="w-5 h-5" strokeWidth={1.75} />,
    },
    {
      href: "/calendar",
      label: "Calendar",
      icon: <Calendar className="w-5 h-5" strokeWidth={1.75} />,
    },
    {
      href: "/messages",
      label: "Alerts",
      icon: <Bell className="w-5 h-5" strokeWidth={1.75} />,
      badge: notificationCount,
    },
    {
      href: "/profile",
      label: "Profile",
      icon: <User className="w-5 h-5" strokeWidth={1.75} />,
    },
  ];
  const bandNavItems: NavItem[] = [
    {
      href: "/home",
      label: "Dashboard",
      icon: <LayoutDashboard className="w-5 h-5" strokeWidth={1.75} />,
    },
    {
      href: "/calendar",
      label: "Shows",
      icon: <Calendar className="w-5 h-5" strokeWidth={1.75} />,
    },
    {
      href: "/analytics",
      label: "Analytics",
      icon: <BarChart3 className="w-5 h-5" strokeWidth={1.75} />,
    },
    {
      href: "/messages",
      label: "Inbox",
      icon: <MessageCircle className="w-5 h-5" strokeWidth={1.75} />,
      badge: messageCount + pendingInviteCount,
    },
    {
      href: "/profile",
      label: "Profile",
      icon: <User className="w-5 h-5" strokeWidth={1.75} />,
    },
  ];
  const isFan = mode === "personal";
  const navItems = isFan ? fanNavItems : bandNavItems;
  const activeClass = isFan ? "text-fan" : "text-band";
  const inactiveClass = "text-muted-foreground";
  const badgeClass = isFan ? "bg-fan" : "bg-band";
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md safe-area-inset-bottom">
      <div className="mx-auto flex h-16 max-w-xl items-center justify-around px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex h-full flex-1 flex-col items-center justify-center gap-1 transition-colors touch-target",
                isActive ? activeClass : inactiveClass,
              )}
            >
              <div className="relative">
                {item.icon}
                {item.badge !== undefined && item.badge > 0 ? (
                  <span
                    className={cn(
                      "absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] rounded-full px-1 text-[10px] font-semibold text-white",
                      "flex items-center justify-center",
                      badgeClass,
                    )}
                  >
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive ? (
                <div
                  className={cn(
                    "absolute top-0 h-0.5 w-7 rounded-full",
                    isFan ? "bg-fan" : "bg-band",
                  )}
                />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

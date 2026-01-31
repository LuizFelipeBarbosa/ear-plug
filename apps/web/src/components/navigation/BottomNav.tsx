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
} from "lucide-react";
import { useCurrentUser } from "@/hooks/useUser";
import { useNotifications } from "@/hooks/useNotifications";
import { useBandConversations } from "@/hooks/useMessages";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  badge?: number;
}

export function BottomNav() {
  const pathname = usePathname();
  const { user, isFan, isMusician } = useCurrentUser();
  const { unreadCount: notificationCount } = useNotifications();
  const { unreadCount: messageCount } = useBandConversations();

  if (!user) return null;

  const fanNavItems: NavItem[] = [
    {
      href: "/home",
      label: "Discover",
      icon: <Map className="w-6 h-6" />,
    },
    {
      href: "/calendar",
      label: "My Events",
      icon: <Calendar className="w-6 h-6" />,
    },
    {
      href: "/messages",
      label: "Notifications",
      icon: <Bell className="w-6 h-6" />,
      badge: notificationCount,
    },
    {
      href: "/profile",
      label: "Profile",
      icon: <User className="w-6 h-6" />,
    },
  ];

  const musicianNavItems: NavItem[] = [
    {
      href: "/home",
      label: "Dashboard",
      icon: <LayoutDashboard className="w-6 h-6" />,
    },
    {
      href: "/calendar",
      label: "Shows",
      icon: <Calendar className="w-6 h-6" />,
    },
    {
      href: "/messages",
      label: "Messages",
      icon: <MessageCircle className="w-6 h-6" />,
      badge: messageCount,
    },
    {
      href: "/profile",
      label: "Profile",
      icon: <User className="w-6 h-6" />,
    },
  ];

  const navItems = isFan ? fanNavItems : musicianNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-surface-dark border-t border-gray-200 dark:border-gray-800 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full relative",
                "transition-colors duration-200",
                isActive
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <div className="relative">
                {item.icon}
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-xs mt-1 font-medium",
                  isActive && "font-semibold"
                )}
              >
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary-600 dark:bg-primary-400 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

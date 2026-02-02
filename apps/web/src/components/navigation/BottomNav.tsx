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
  Music,
  CalendarCheck,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/useUser";
import { useNotifications } from "@/hooks/useNotifications";
import { useBandConversations } from "@/hooks/useMessages";
import { useBandBookings, useBookingConversations } from "@/hooks/useBookings";
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
  const { counts: bookingCounts } = useBandBookings();
  const { unreadCount: bookingMessageCount } = useBookingConversations();

  if (!user) return null;

  // Calculate booking badge count (pending requests for musicians)
  const bookingBadgeCount = isMusician ? bookingCounts.pending : 0;

  const fanNavItems: NavItem[] = [
    {
      href: "/home",
      label: "Discover",
      icon: <Map className="w-6 h-6" strokeWidth={1.5} />,
    },
    {
      href: "/hire",
      label: "Hire a Band",
      icon: <Music className="w-6 h-6" strokeWidth={1.5} />,
    },
    {
      href: "/my-bookings",
      label: "My Bookings",
      icon: <CalendarCheck className="w-6 h-6" strokeWidth={1.5} />,
      badge: bookingMessageCount,
    },
    {
      href: "/profile",
      label: "Profile",
      icon: <User className="w-6 h-6" strokeWidth={1.5} />,
    },
  ];

  const musicianNavItems: NavItem[] = [
    {
      href: "/home",
      label: "Dashboard",
      icon: <LayoutDashboard className="w-6 h-6" strokeWidth={1.5} />,
    },
    {
      href: "/bookings",
      label: "Bookings",
      icon: <CalendarCheck className="w-6 h-6" strokeWidth={1.5} />,
      badge: bookingBadgeCount,
    },
    {
      href: "/messages",
      label: "Messages",
      icon: <MessageCircle className="w-6 h-6" strokeWidth={1.5} />,
      badge: messageCount + bookingMessageCount,
    },
    {
      href: "/profile",
      label: "Profile",
      icon: <User className="w-6 h-6" strokeWidth={1.5} />,
    },
  ];

  const navItems = isFan ? fanNavItems : musicianNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-night-secondary/95 backdrop-blur-lg border-t-2 border-lime/20 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full relative touch-target",
                "transition-all duration-200",
                isActive
                  ? "text-lime"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <div className="relative">
                {/* Active indicator glow */}
                {isActive && (
                  <div className="absolute inset-0 bg-lime/20 blur-xl rounded-full" />
                )}
                <div className={cn(
                  "relative transition-transform duration-200",
                  isActive && "scale-110"
                )}>
                  {item.icon}
                </div>
                
                {/* Badge */}
                {item.badge !== undefined && item.badge > 0 ? (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-lime text-night text-xs font-bold rounded-full flex items-center justify-center px-1">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </div>
              
              {/* Label */}
              <span
                className={cn(
                  "text-[10px] mt-1 font-medium tracking-wide uppercase",
                  isActive && "font-bold"
                )}
              >
                {item.label}
              </span>
              
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-lime rounded-full shadow-glow-lime" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import { SignOutButton } from "@clerk/nextjs";
import {
  MapPin,
  Users,
  Music,
  Settings,
  LogOut,
  BarChart2,
  Edit,
  Instagram,
  Youtube,
  ExternalLink,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { useCurrentBand, useBandAnalytics } from "@/hooks/useBand";
import { EditBandProfileModal } from "@/components/band/EditBandProfileModal";
import { DemoMediaGallery } from "@/components/band/MediaGallery";
import { GENRE_COLORS, formatFullDate } from "@ear-plug/shared/constants";
import { getInitials } from "@ear-plug/shared/utils";
import { cn } from "@/lib/utils";
import type { Genre } from "@ear-plug/shared/types";

const CHART_COLORS = ["#7c3aed", "#ec4899"];

export function BandProfileView() {
  const { band, bandWithStats, isLoading } = useCurrentBand();
  const [showEditModal, setShowEditModal] = useState(false);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(false);
  const { analytics, isLoading: analyticsLoading } = useBandAnalytics(band?._id);

  if (isLoading) {
    return (
      <div className="min-h-screen p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl" />
          <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!band) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">No band profile found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-6">
      {/* Header */}
      <header className="bg-gradient-to-b from-accent-600 to-accent-800 text-white p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Band Profile</h1>
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Band Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/20 flex-shrink-0">
              {band.image ? (
                <Image
                  src={band.image}
                  alt={band.name}
                  width={80}
                  height={80}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold">
                  {getInitials(band.name)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{band.name}</h2>
              <div className="flex flex-wrap gap-1 mt-1">
                {(band.genres || []).map((g) => (
                  <div
                    key={g}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: `${GENRE_COLORS[g as Genre]}40` }}
                  >
                    <Music className="w-3 h-3" />
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-2 text-sm text-white/80">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {band.location}
                </span>
                {band.memberCount && (
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {band.memberCount} members
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowEditModal(true)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <Edit className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Bio */}
      {band.bio && (
        <section className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            About
          </h3>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            {band.bio}
          </p>
        </section>
      )}

      {/* Social Links */}
      {band.socialLinks && (
        <section className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Social Links
          </h3>
          <div className="flex flex-wrap gap-3">
            {band.socialLinks.spotify && (
              <SocialButton
                href={band.socialLinks.spotify}
                icon="spotify"
                label="Spotify"
              />
            )}
            {band.socialLinks.appleMusic && (
              <SocialButton
                href={band.socialLinks.appleMusic}
                icon="apple"
                label="Apple Music"
              />
            )}
            {band.socialLinks.instagram && (
              <SocialButton
                href={band.socialLinks.instagram}
                icon="instagram"
                label="Instagram"
              />
            )}
            {band.socialLinks.youtube && (
              <SocialButton
                href={band.socialLinks.youtube}
                icon="youtube"
                label="YouTube"
              />
            )}
            {band.socialLinks.tiktok && (
              <SocialButton
                href={band.socialLinks.tiktok}
                icon="tiktok"
                label="TikTok"
              />
            )}
            {band.socialLinks.website && (
              <SocialButton
                href={band.socialLinks.website}
                icon="website"
                label="Website"
              />
            )}
          </div>
        </section>
      )}

      {/* Media Gallery */}
      <section className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Photos & Videos
        </h3>
        <DemoMediaGallery />
      </section>

      {/* Analytics Report Section (Inline) */}
      <section className="p-4">
        <button
          onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
          className="w-full flex items-center justify-between p-4 bg-white dark:bg-surface-dark-secondary rounded-xl shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-primary-600" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Analytics Report
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {analyticsExpanded ? "Hide" : "View"} your performance metrics
              </p>
            </div>
          </div>
          {analyticsExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {/* Expanded Analytics Content */}
        {analyticsExpanded && (
          <div className="mt-4 space-y-4">
            {analyticsLoading || !analytics ? (
              <div className="animate-pulse space-y-4">
                <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl" />
              </div>
            ) : (
              <>
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-surface-dark-secondary rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-primary-500" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">Total RSVPs</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {analytics.totalRsvps}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-surface-dark-secondary rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-accent-500" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">Total Shows</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {analytics.eventCount}
                    </div>
                  </div>
                </div>

                {/* Bar Chart - Past Event Comparison */}
                <div className="bg-white dark:bg-surface-dark-secondary rounded-xl p-4 shadow-sm">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                    Past Event Comparison
                  </h4>
                  {analytics.eventComparison.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={analytics.eventComparison}>
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "none",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          }}
                          labelStyle={{ fontWeight: "bold" }}
                        />
                        <Bar
                          dataKey="rsvps"
                          fill="#7c3aed"
                          radius={[4, 4, 0, 0]}
                          name="RSVPs"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-gray-500 py-6">
                      No past events to compare
                    </p>
                  )}
                </div>

                {/* Pie Chart - Traffic Rate */}
                <div className="bg-white dark:bg-surface-dark-secondary rounded-xl p-4 shadow-sm">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                    Audience Breakdown
                  </h4>
                  {analytics.trafficData.some((d) => d.value > 0) ? (
                    <div className="flex items-center justify-center">
                      <ResponsiveContainer width={160} height={160}>
                        <PieChart>
                          <Pie
                            data={analytics.trafficData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {analytics.trafficData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-3 ml-4">
                        {analytics.trafficData.map((item, index) => (
                          <div key={item.name} className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                              }}
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {item.name}
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {item.value}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-6">
                      Not enough data for audience breakdown
                    </p>
                  )}
                </div>

                {/* Venue Performance */}
                {analytics.eventComparison.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                      Venue Performance
                    </h4>
                    {analytics.eventComparison.map((event, index) => (
                      <div
                        key={index}
                        className="bg-white dark:bg-surface-dark-secondary rounded-xl p-4 flex items-center justify-between"
                      >
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white">
                            {event.venueName}
                          </h5>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {event.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary-600">
                            {event.rsvps}
                          </div>
                          <div className="text-xs text-gray-500">RSVPs</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Generated {formatFullDate(Date.now())}
                </p>
              </>
            )}
          </div>
        )}
      </section>

      {/* Stats Summary */}
      {bandWithStats?.stats && (
        <section className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Quick Stats
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="Shows This Month"
              value={bandWithStats.stats.showsThisMonth}
            />
            <StatCard label="Total RSVPs" value={bandWithStats.stats.totalRsvps} />
            <StatCard label="Followers" value={bandWithStats.stats.newFans} />
          </div>
        </section>
      )}

      {/* Sign Out */}
      <div className="p-4 pt-8">
        <SignOutButton>
          <button className="w-full flex items-center justify-center gap-2 py-3 text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </SignOutButton>
      </div>

      {/* Edit Profile Modal */}
      <EditBandProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        band={{
          _id: band._id,
          name: band.name,
          genres: band.genres || [],
          location: band.location,
          bio: band.bio,
          memberCount: band.memberCount,
          image: band.image,
          socialLinks: band.socialLinks,
        }}
      />
    </div>
  );
}

function SocialButton({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  const getIcon = () => {
    switch (icon) {
      case "instagram":
        return <Instagram className="w-5 h-5" />;
      case "youtube":
        return <Youtube className="w-5 h-5" />;
      default:
        return <ExternalLink className="w-5 h-5" />;
    }
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-surface-dark-secondary rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
    >
      {getIcon()}
      <span className="text-sm font-medium">{label}</span>
    </a>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-50 dark:bg-surface-dark-secondary rounded-xl p-4 text-center">
      <div className="text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {label}
      </div>
    </div>
  );
}

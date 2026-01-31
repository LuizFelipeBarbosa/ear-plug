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
  ExternalLink,
  BarChart2,
  Edit,
  Instagram,
  Youtube,
} from "lucide-react";
import { useCurrentBand, useBandAnalytics } from "@/hooks/useBand";
import { AnalyticsReport } from "@/components/band/AnalyticsReport";
import { EditBandProfileModal } from "@/components/band/EditBandProfileModal";
import { DemoMediaGallery } from "@/components/band/MediaGallery";
import { GENRE_COLORS } from "@ear-plug/shared/constants";
import { getInitials } from "@ear-plug/shared/utils";
import { cn } from "@/lib/utils";
import type { Genre } from "@ear-plug/shared/types";

export function BandProfileView() {
  const { band, bandWithStats, isLoading } = useCurrentBand();
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

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

  if (showAnalytics) {
    return (
      <AnalyticsReport
        bandId={band._id}
        onBack={() => setShowAnalytics(false)}
      />
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
              <div
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium mt-1"
                style={{ backgroundColor: `${GENRE_COLORS[band.genre]}40` }}
              >
                <Music className="w-3 h-3" />
                {band.genre.charAt(0).toUpperCase() + band.genre.slice(1)}
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

      {/* Analytics Button */}
      <section className="p-4">
        <button
          onClick={() => setShowAnalytics(true)}
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
                View your performance metrics
              </p>
            </div>
          </div>
          <ExternalLink className="w-5 h-5 text-gray-400" />
        </button>
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
          genre: band.genre as Genre,
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

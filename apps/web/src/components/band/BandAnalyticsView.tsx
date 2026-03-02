"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Calendar,
  ChevronRight,
  Clock,
  Eye,
  MapPin,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useBandAnalytics, useCurrentBand } from "@/hooks/useBand";
import { formatFullDate, getRelativeTime } from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

const CHART_COLORS = {
  primary: "#7c3aed", // band-600
  primaryLight: "#a78bfa", // band-400
  secondary: "#3b82f6", // blue-500
  secondaryLight: "#60a5fa", // blue-400
  accent: "#10b981", // emerald-500
  muted: "#71717a", // zinc-500
};

const ANIMATION_VARIANTS = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  },
  item: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 24 },
    },
  },
  card: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: "spring" as const, stiffness: 400, damping: 30 },
    },
  },
};

export function BandAnalyticsView() {
  const { band, isLoading: bandLoading } = useCurrentBand();
  const { analytics, isLoading: analyticsLoading } = useBandAnalytics(
    band?._id,
  );

  const hasData = useMemo(
    () => analytics && analytics.eventComparison.length > 0,
    [analytics],
  );

  if (bandLoading || analyticsLoading) {
    return <AnalyticsSkeleton />;
  }

  if (!band) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-10 h-10 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium text-foreground">
            No band profile found
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Create your band to view analytics
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8 bg-background">
      {/* Header */}
      <header className="relative bg-gradient-to-br from-band/10 via-background to-background border-b border-border overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-band/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-band/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

        <div className="relative px-5 pt-6 pb-5">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-band/10 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-band" />
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Band Workspace
              </span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Performance insights and audience metrics
            </p>
          </motion.div>
        </div>
      </header>

      <motion.main
        variants={ANIMATION_VARIANTS.container}
        initial="hidden"
        animate="visible"
        className="px-4 pt-4 space-y-5"
      >
        {/* Key Metrics */}
        <section>
          <motion.div
            variants={ANIMATION_VARIANTS.item}
            className="flex items-center justify-between mb-3"
          >
            <h2 className="text-sm font-semibold text-foreground">
              Performance Overview
            </h2>
            <span className="text-xs text-muted-foreground">
              Last updated {getRelativeTime(Date.now())}
            </span>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MetricCard
              icon={<Users className="w-4 h-4" />}
              label="Total RSVPs"
              value={analytics?.totalRsvps ?? 0}
              color="primary"
              delay={0}
            />
            <MetricCard
              icon={<Calendar className="w-4 h-4" />}
              label="Total Shows"
              value={analytics?.eventCount ?? 0}
              color="secondary"
              delay={1}
            />
            <MetricCard
              icon={<UserCheck className="w-4 h-4" />}
              label="Avg Attendance"
              value={Number.isFinite(analytics?.averageAttendancePerShow)
                ? analytics!.averageAttendancePerShow.toFixed(1)
                : "0.0"}
              suffix=""
              color="accent"
              delay={2}
            />
          </div>
        </section>

        {/* Best & Worst Shows */}
        {hasData && (
          <motion.section variants={ANIMATION_VARIANTS.item}>
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Show Highlights
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ShowCard
                icon={<Trophy className="w-4 h-4" />}
                label="Best Attendance"
                variant="best"
                show={analytics!.bestAttendanceShow}
              />
              <ShowCard
                icon={<TrendingDown className="w-4 h-4" />}
                label="Lowest Show"
                variant="lowest"
                show={analytics!.lowestShow}
              />
            </div>
          </motion.section>
        )}

        {/* Event Comparison Chart */}
        <motion.section variants={ANIMATION_VARIANTS.item}>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-band/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-band" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">
                      Event Performance
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      RSVPs vs Actual Attendance
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: CHART_COLORS.primary }}
                    />
                    <span className="text-muted-foreground">RSVPs</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: CHART_COLORS.secondary }}
                    />
                    <span className="text-muted-foreground">Attended</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4">
              {hasData ? (
                <div className="w-full min-w-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={analytics!.eventComparison}
                      barCategoryGap="20%"
                      barGap={6}
                      margin={{ top: 8, right: 8, left: -8, bottom: 6 }}
                    >
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: "#71717A", fontWeight: 500 }}
                        axisLine={false}
                        tickLine={false}
                        tickMargin={10}
                        interval={0}
                        angle={analytics!.eventComparison.length > 4 ? -30 : 0}
                        textAnchor={
                          analytics!.eventComparison.length > 4 ? "end" : "middle"
                        }
                        height={analytics!.eventComparison.length > 4 ? 50 : 30}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#71717A" }}
                        axisLine={false}
                        tickLine={false}
                        width={32}
                        allowDecimals={false}
                      />
                      <Tooltip
                        content={<EventComparisonTooltip />}
                        cursor={{ fill: "rgba(124, 58, 237, 0.05)" }}
                      />
                      <Bar
                        dataKey="rsvps"
                        fill={CHART_COLORS.primary}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={24}
                        animationDuration={1000}
                      />
                      <Bar
                        dataKey="attended"
                        fill={CHART_COLORS.secondary}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={24}
                        animationDuration={1200}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyChartState
                  icon={<TrendingUp className="w-8 h-8" />}
                  title="No events to compare"
                  description="Complete some shows to see your performance trends"
                />
              )}
            </div>
          </div>
        </motion.section>

        {/* Audience Breakdown */}
        <motion.section variants={ANIMATION_VARIANTS.item}>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-fan/10 flex items-center justify-center">
                  <Eye className="w-4 h-4 text-fan" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Audience Breakdown
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Fan discovery sources
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4">
              {analytics?.trafficData.some((d) => d.value > 0) ? (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie
                        data={analytics.trafficData}
                        cx="50%"
                        cy="50%"
                        innerRadius={56}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                        animationDuration={1000}
                        animationBegin={200}
                      >
                        {analytics.trafficData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              [
                                CHART_COLORS.primary,
                                CHART_COLORS.secondary,
                                CHART_COLORS.accent,
                                CHART_COLORS.primaryLight,
                              ][index % 4]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<TrafficTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="space-y-2.5 w-full sm:w-auto">
                    {analytics.trafficData.map((item, index) => (
                      <motion.div
                        key={item.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        className="flex items-center justify-between sm:justify-start gap-4 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-3 h-3 rounded"
                            style={{
                              backgroundColor:
                                [
                                  CHART_COLORS.primary,
                                  CHART_COLORS.secondary,
                                  CHART_COLORS.accent,
                                  CHART_COLORS.primaryLight,
                                ][index % 4],
                            }}
                          />
                          <span className="text-sm text-muted-foreground">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-foreground min-w-[3ch] text-right">
                          {item.value}%
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyChartState
                  icon={<Eye className="w-8 h-8" />}
                  title="Not enough data"
                  description="Audience insights will appear as fans discover your shows"
                />
              )}
            </div>
          </div>
        </motion.section>

        {/* Venue Performance List */}
        {hasData && (
          <motion.section variants={ANIMATION_VARIANTS.item}>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">
                      Venue Performance
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Show breakdown by location
                    </p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-border/50">
                {analytics!.eventComparison.map((event, index) => (
                  <motion.div
                    key={`${event.venueName}-${event.name}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    whileHover={{ backgroundColor: "rgba(124, 58, 237, 0.02)" }}
                    className="p-4 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground text-sm truncate">
                          {event.venueName}
                        </h3>
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {event.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-right flex-shrink-0 ml-4">
                      <div>
                        <p className="text-band text-lg font-bold leading-none">
                          {event.rsvps}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          RSVPs
                        </p>
                      </div>
                      <div className="w-px h-8 bg-border" />
                      <div>
                        <p className="text-fan text-lg font-bold leading-none">
                          {event.attended}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Attended
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>
        )}

        {/* Footer */}
        <motion.p
          variants={ANIMATION_VARIANTS.item}
          className="text-xs text-muted-foreground text-center"
        >
          Analytics generated {formatFullDate(Date.now())}
        </motion.p>
      </motion.main>
    </div>
  );
}

// Components

function MetricCard({
  icon,
  label,
  value,
  suffix = "",
  color,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  suffix?: string;
  color: "primary" | "secondary" | "accent";
  delay: number;
}) {
  const colorClasses = {
    primary: "from-band/20 to-band/5 text-band",
    secondary: "from-blue-500/20 to-blue-500/5 text-blue-500",
    accent: "from-emerald-500/20 to-emerald-500/5 text-emerald-500",
  };

  return (
    <motion.div
      variants={ANIMATION_VARIANTS.card}
      
      transition={{ delay: delay * 0.05 }}
      className="relative bg-card border border-border p-4 rounded-xl overflow-hidden group"
    >
      {/* Background gradient */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity",
          colorClasses[color],
        )}
      />

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div
            className={cn(
              "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center",
              colorClasses[color],
            )}
          >
            {icon}
          </div>
        </div>
        <p className="text-2xl font-bold text-foreground">
          {value}
          {suffix && (
            <span className="text-lg text-muted-foreground ml-0.5">
              {suffix}
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </motion.div>
  );
}

function ShowCard({
  icon,
  label,
  variant,
  show,
}: {
  icon: React.ReactNode;
  label: string;
  variant: "best" | "lowest";
  show: {
    eventName: string;
    venueName: string;
    dateTime: number;
    attended: number;
  } | null;
}) {
  const isBest = variant === "best";

  return (
    <motion.div

      className={cn(
        "relative bg-card border p-4 rounded-xl overflow-hidden",
        isBest
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-border bg-muted/30",
      )}
    >
      {/* Decorative gradient */}
      <div
        className={cn(
          "absolute -right-4 -top-4 w-20 h-20 rounded-full blur-2xl opacity-30",
          isBest ? "bg-amber-500" : "bg-muted-foreground",
        )}
      />

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              isBest
                ? "bg-amber-500/20 text-amber-500"
                : "bg-muted text-muted-foreground",
            )}
          >
            {icon}
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
        </div>

        {show ? (
          <>
            <p
              className={cn(
                "text-3xl font-bold",
                isBest ? "text-amber-500" : "text-foreground",
              )}
            >
              {show.attended}
              <span className="text-base font-medium text-muted-foreground ml-1">
                attended
              </span>
            </p>
            <p className="text-sm font-medium text-foreground mt-2 truncate">
              {show.eventName}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <MapPin className="w-3 h-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground truncate">
                {show.venueName}
              </p>
              <span className="text-muted-foreground">•</span>
              <Clock className="w-3 h-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {new Date(show.dateTime).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </>
        ) : (
          <div className="py-4">
            <p className="text-sm text-muted-foreground">No shows yet</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function EmptyChartState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="py-12 text-center">
      <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">
        {description}
      </p>
    </div>
  );
}

// Chart Tooltips

function EventComparisonTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const rsvps = payload.find((item) => item.name === "rsvps")?.value ?? 0;
  const attended =
    payload.find((item) => item.name === "attended")?.value ?? 0;
  const conversionRate = rsvps > 0 ? ((attended / rsvps) * 100).toFixed(0) : 0;

  return (
    <div className="bg-card border border-border shadow-lg p-3 rounded-xl">
      <p className="text-foreground font-medium text-sm mb-2">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className="w-2 h-2 rounded-sm"
              style={{ backgroundColor: CHART_COLORS.primary }}
            />
            RSVPs
          </span>
          <span className="text-sm font-semibold text-foreground">{rsvps}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className="w-2 h-2 rounded-sm"
              style={{ backgroundColor: CHART_COLORS.secondary }}
            />
            Attended
          </span>
          <span className="text-sm font-semibold text-foreground">
            {attended}
          </span>
        </div>
        <div className="pt-1.5 border-t border-border/50">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">Conversion</span>
            <span className="text-sm font-semibold text-band">
              {conversionRate}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrafficTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload?: { name: string } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0];
  const value = data?.value ?? 0;
  const name = data?.payload?.name ?? "";

  return (
    <div className="bg-card border border-border shadow-lg px-3 py-2 rounded-lg">
      <p className="text-sm font-medium text-foreground">{name}</p>
      <p className="text-xs text-band font-semibold">{value}%</p>
    </div>
  );
}

// Skeleton Loading

function AnalyticsSkeleton() {
  return (
    <div className="min-h-screen pb-8 bg-background">
      {/* Header Skeleton */}
      <div className="relative bg-muted border-b border-border overflow-hidden">
        <div className="px-5 pt-6 pb-5">
          <div className="animate-shimmer space-y-3">
            <div className="w-8 h-8 bg-muted-foreground/20 rounded-lg" />
            <div className="h-8 w-32 bg-muted-foreground/20 rounded" />
            <div className="h-4 w-48 bg-muted-foreground/10 rounded" />
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="px-4 pt-4 space-y-5">
        {/* Metrics Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-muted border border-border p-4 rounded-xl animate-shimmer"
            >
              <div className="w-8 h-8 bg-muted-foreground/10 rounded-lg mb-3" />
              <div className="h-8 w-16 bg-muted-foreground/20 rounded mb-1" />
              <div className="h-4 w-20 bg-muted-foreground/10 rounded" />
            </div>
          ))}
        </div>

        {/* Chart Skeleton */}
        <div className="bg-muted border border-border rounded-2xl overflow-hidden animate-shimmer">
          <div className="p-4 border-b border-border/50">
            <div className="h-10 w-48 bg-muted-foreground/10 rounded" />
          </div>
          <div className="p-4 h-64 bg-muted-foreground/5" />
        </div>

        {/* Pie Chart Skeleton */}
        <div className="bg-muted border border-border rounded-2xl overflow-hidden animate-shimmer">
          <div className="p-4 border-b border-border/50">
            <div className="h-10 w-48 bg-muted-foreground/10 rounded" />
          </div>
          <div className="p-4 h-64 bg-muted-foreground/5 flex items-center justify-center">
            <div className="w-40 h-40 rounded-full border-8 border-muted-foreground/10" />
          </div>
        </div>
      </div>
    </div>
  );
}

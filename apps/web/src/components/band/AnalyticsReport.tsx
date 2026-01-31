"use client";

import { ArrowLeft, Calendar, MapPin, Users } from "lucide-react";
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
import { useBandAnalytics, useCurrentBand } from "@/hooks/useBand";
import { formatFullDate } from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../../convex/_generated/dataModel";

interface AnalyticsReportProps {
  bandId: Id<"bands">;
  onBack: () => void;
}

// Electric Indie-Brutalist Chart Colors
const CHART_COLORS = {
  lime: "#C2FF00",
  violet: "#8B5CF6",
  limeDark: "#9FD900",
  violetDark: "#7C3AED",
};

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-night-secondary border-2 border-lime p-3 shadow-glow-lime">
        <p className="text-white font-bold uppercase text-sm tracking-wide">{label}</p>
        <p className="text-lime text-lg font-bold mt-1">
          {payload[0].value} RSVPs
        </p>
      </div>
    );
  }
  return null;
};

export function AnalyticsReport({ bandId, onBack }: AnalyticsReportProps) {
  const { band } = useCurrentBand();
  const { analytics, isLoading } = useBandAnalytics(bandId);

  if (isLoading || !analytics) {
    return (
      <div className="min-h-screen p-4 bg-night">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-400 mb-6 hover:text-lime transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <div className="animate-shimmer space-y-6">
          <div className="h-8 bg-night-tertiary w-1/2" />
          <div className="h-64 bg-night-tertiary border-2 border-zinc-800" />
          <div className="h-48 bg-night-tertiary border-2 border-zinc-800" />
        </div>
      </div>
    );
  }

  // Prepare data with alternating colors for bar chart
  const chartData = analytics.eventComparison.map((event: any, index: number) => ({
    ...event,
    fill: index % 2 === 0 ? CHART_COLORS.lime : CHART_COLORS.violet,
  }));

  return (
    <div className="min-h-screen pb-6 bg-night">
      {/* Header */}
      <header className="bg-night-secondary border-b-2 border-lime/20 p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-400 mb-4 hover:text-lime transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Profile
        </button>
        <h1 className="text-2xl font-bold text-white uppercase tracking-tight">
          Analytics Report
        </h1>
        <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">
          Generated {formatFullDate(Date.now())}
        </p>
      </header>

      {/* Summary Stats */}
      <section className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={<Users className="w-5 h-5 text-lime" />}
            value={analytics.totalRsvps}
            label="Total RSVPs"
            color="lime"
          />
          <StatCard
            icon={<Calendar className="w-5 h-5 text-violet" />}
            value={analytics.eventCount}
            label="Total Shows"
            color="violet"
          />
        </div>
      </section>

      {/* Bar Chart - Past Event Comparison */}
      <section className="p-4">
        <h2 className="text-lg font-bold uppercase tracking-tight text-white mb-4">
          Past Event Comparison
        </h2>
        <div className="bg-night-secondary border-2 border-zinc-800 p-4">
          {analytics.eventComparison.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barSize={40}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#71717A", fontWeight: 600 }}
                  axisLine={{ stroke: "#333333" }}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#71717A" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(194, 255, 0, 0.1)" }} />
                <Bar
                  dataKey="rsvps"
                  radius={[4, 4, 0, 0]}
                  name="RSVPs"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-zinc-800">
              <p className="text-zinc-500">No past events to compare</p>
            </div>
          )}
        </div>
      </section>

      {/* Pie Chart - Traffic Rate */}
      <section className="p-4">
        <h2 className="text-lg font-bold uppercase tracking-tight text-white mb-4">
          Audience Breakdown
        </h2>
        <div className="bg-night-secondary border-2 border-zinc-800 p-4">
          {analytics.trafficData.some((d: any) => d.value > 0) ? (
            <div className="flex items-center justify-center">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={analytics.trafficData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {analytics.trafficData.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index % 2 === 0 ? CHART_COLORS.lime : CHART_COLORS.violet}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 ml-6">
                {analytics.trafficData.map((item: any, index: number) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-sm"
                      style={{
                        backgroundColor: index % 2 === 0 ? CHART_COLORS.lime : CHART_COLORS.violet,
                      }}
                    />
                    <span className="text-xs text-zinc-400 uppercase tracking-wider">
                      {item.name}
                    </span>
                    <span className="font-bold text-white">
                      {item.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-zinc-800">
              <p className="text-zinc-500">Not enough data for audience breakdown</p>
            </div>
          )}
        </div>
      </section>

      {/* Venue Performance */}
      {analytics.eventComparison.length > 0 && (
        <section className="p-4">
          <h2 className="text-lg font-bold uppercase tracking-tight text-white mb-4">
            Venue Performance
          </h2>
          <div className="space-y-3">
            {analytics.eventComparison.map((event: any, index: number) => (
              <div
                key={index}
                className="bg-night-secondary border-2 border-zinc-800 p-4 flex items-center justify-between hover:border-lime/20 transition-colors"
              >
                <div>
                  <h3 className="font-bold text-white text-sm uppercase tracking-wide">
                    {event.venueName}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    {event.name}
                  </p>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "text-xl font-bold",
                    index % 2 === 0 ? "text-lime" : "text-violet"
                  )}>
                    {event.rsvps}
                  </div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">RSVPs</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  color = "lime",
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color?: "lime" | "violet";
}) {
  return (
    <div className="bg-night-secondary border-2 border-zinc-800 p-4 relative overflow-hidden group hover:border-lime/20 transition-colors">
      {/* Accent line */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-0.5",
        color === "lime" ? "bg-lime" : "bg-violet"
      )} />
      
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">{label}</span>
      </div>
      <div className={cn(
        "text-4xl font-bold",
        color === "lime" ? "text-lime" : "text-violet"
      )}>
        {value}
      </div>
    </div>
  );
}

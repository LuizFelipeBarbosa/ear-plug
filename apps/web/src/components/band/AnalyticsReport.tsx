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

const CHART_COLORS = ["#7c3aed", "#ec4899"];

export function AnalyticsReport({ bandId, onBack }: AnalyticsReportProps) {
  const { band } = useCurrentBand();
  const { analytics, isLoading } = useBandAnalytics(bandId);

  if (isLoading || !analytics) {
    return (
      <div className="min-h-screen p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl" />
          <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-6">
      {/* Header */}
      <header className="bg-white dark:bg-surface-dark border-b border-gray-200 dark:border-gray-800 p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Profile
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Analytics Report
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Generated {formatFullDate(Date.now())}
        </p>
      </header>

      {/* Summary Stats */}
      <section className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={<Users className="w-5 h-5 text-primary-500" />}
            value={analytics.totalRsvps}
            label="Total RSVPs"
          />
          <StatCard
            icon={<Calendar className="w-5 h-5 text-accent-500" />}
            value={analytics.eventCount}
            label="Total Shows"
          />
        </div>
      </section>

      {/* Bar Chart - Past Event Comparison */}
      <section className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Past Event Comparison
        </h2>
        <div className="bg-white dark:bg-surface-dark-secondary rounded-xl p-4 shadow-sm">
          {analytics.eventComparison.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.eventComparison}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
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
            <p className="text-center text-gray-500 py-8">
              No past events to compare
            </p>
          )}
        </div>
      </section>

      {/* Pie Chart - Traffic Rate */}
      <section className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Audience Breakdown
        </h2>
        <div className="bg-white dark:bg-surface-dark-secondary rounded-xl p-4 shadow-sm">
          {analytics.trafficData.some((d) => d.value > 0) ? (
            <div className="flex items-center justify-center">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={analytics.trafficData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
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
            <p className="text-center text-gray-500 py-8">
              Not enough data for audience breakdown
            </p>
          )}
        </div>
      </section>

      {/* Venue Performance */}
      {analytics.eventComparison.length > 0 && (
        <section className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Venue Performance
          </h2>
          <div className="space-y-3">
            {analytics.eventComparison.map((event, index) => (
              <div
                key={index}
                className="bg-white dark:bg-surface-dark-secondary rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {event.venueName}
                  </h3>
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
        </section>
      )}
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="bg-white dark:bg-surface-dark-secondary rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-white">
        {value}
      </div>
    </div>
  );
}

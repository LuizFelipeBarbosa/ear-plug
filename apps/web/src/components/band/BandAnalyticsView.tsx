"use client";

import { Calendar, Trophy, TrendingDown, UserCheck, Users } from "lucide-react";
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
import { formatFullDate } from "@ear-plug/shared/constants";
import { cn } from "@/lib/utils";

const CHART_COLORS = {
  fan: "#2563eb",
  band: "#8B5CF6",
};

export function BandAnalyticsView() {
  const { band, isLoading: bandLoading } = useCurrentBand();
  const { analytics, isLoading: analyticsLoading } = useBandAnalytics(
    band?._id,
  );

  if (bandLoading || analyticsLoading || !analytics) {
    return (
      <div className="min-h-screen p-4 bg-background">
        <div className="animate-shimmer space-y-4">
          <div className="h-24 bg-muted border border-border rounded-lg" />
          <div className="h-48 bg-muted border border-border rounded-lg" />
          <div className="h-48 bg-muted border border-border rounded-lg" />
        </div>
      </div>
    );
  }

  if (!band) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">No band profile found</p>
      </div>
    );
  }

  const averageAttendance = Number.isFinite(analytics.averageAttendancePerShow)
    ? analytics.averageAttendancePerShow.toFixed(1)
    : "0.0";

  return (
    <div className="min-h-screen pb-6 bg-background overflow-x-hidden">
      <header className="relative bg-card border-b border-band/20 p-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-band/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <p className="text-xs font-medium text-muted-foreground">
            Band Mode
          </p>
          <h1 className="text-xl font-semibold text-foreground mt-2">
            Analytics
          </h1>
          <p className="text-xs text-muted-foreground mt-2">
            Checked-in attendance + RSVP performance
          </p>
        </div>
      </header>

      <section className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <MetricCard
            icon={<Users className="w-4 h-4 text-band" />}
            label="Total RSVPs"
            value={analytics.totalRsvps.toLocaleString()}
          />
          <MetricCard
            icon={<Calendar className="w-4 h-4 text-band" />}
            label="Total Shows"
            value={analytics.eventCount.toLocaleString()}
          />
          <MetricCard
            icon={<UserCheck className="w-4 h-4 text-band" />}
            label="Avg Attendance / Show"
            value={averageAttendance}
          />
          <ShowMetricCard
            icon={<Trophy className="w-4 h-4 text-band" />}
            label="Best Attendance Show"
            show={analytics.bestAttendanceShow}
          />
          <ShowMetricCard
            icon={<TrendingDown className="w-4 h-4 text-band" />}
            label="Lowest Show"
            show={analytics.lowestShow}
          />
        </div>
      </section>

      <section className="p-4 pt-0">
        <div className="bg-muted border border-border p-4 rounded-lg">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-sm font-medium text-muted-foreground">
              Past Event Comparison
            </h2>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-band rounded" />
                RSVPs
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-fan rounded" />
                Attended
              </span>
            </div>
          </div>
          {analytics.eventComparison.length > 0 ? (
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={analytics.eventComparison}
                  barCategoryGap="16%"
                  barGap={4}
                  margin={{ top: 8, right: 8, left: 0, bottom: 6 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#71717A", fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                    padding={{ left: 10, right: 10 }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#71717A" }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip content={<EventComparisonTooltip />} />
                  <Bar
                    dataKey="rsvps"
                    fill={CHART_COLORS.band}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={16}
                    minPointSize={3}
                  />
                  <Bar
                    dataKey="attended"
                    fill={CHART_COLORS.fan}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={16}
                    minPointSize={3}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-10">
              No past events to compare
            </p>
          )}
        </div>
      </section>

      <section className="p-4 pt-0">
        <div className="bg-muted border border-border p-4 rounded-lg">
          <h2 className="text-sm font-medium text-muted-foreground mb-4">
            Audience Breakdown
          </h2>
          {analytics.trafficData.some((datum) => datum.value > 0) ? (
            <div className="flex items-center justify-center">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie
                    data={analytics.trafficData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={74}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {analytics.trafficData.map((entry, index) => (
                      <Cell
                        key={`${entry.name}-${index}`}
                        fill={
                          index % 2 === 0 ? CHART_COLORS.fan : CHART_COLORS.band
                        }
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
                      className="w-3 h-3 rounded"
                      style={{
                        backgroundColor:
                          index % 2 === 0
                            ? CHART_COLORS.fan
                            : CHART_COLORS.band,
                      }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {item.name}
                    </span>
                    <span className="font-medium text-foreground">
                      {item.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-10">
              Not enough data for audience breakdown
            </p>
          )}
        </div>
      </section>

      {analytics.eventComparison.length > 0 && (
        <section className="p-4 pt-0">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Venue Performance
          </h2>
          <div className="space-y-3">
            {analytics.eventComparison.map((event, index) => (
              <div
                key={`${event.venueName}-${event.name}-${index}`}
                className="bg-muted border border-border p-4 flex items-center justify-between hover:border-band/20 transition-colors rounded-lg"
              >
                <div>
                  <h3 className="font-medium text-foreground text-sm">
                    {event.venueName}
                  </h3>
                  <p className="text-xs text-muted-foreground">{event.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-band text-lg font-semibold">{event.rsvps}</p>
                  <p className="text-band text-sm font-medium">
                    {event.attended} attended
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="text-xs text-muted-foreground text-center px-4">
        Generated {formatFullDate(Date.now())}
      </p>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-muted border border-border p-4 relative overflow-hidden rounded-lg">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-band" />
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-3xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ShowMetricCard({
  icon,
  label,
  show,
}: {
  icon: React.ReactNode;
  label: string;
  show: {
    eventName: string;
    venueName: string;
    dateTime: number;
    attended: number;
  } | null;
}) {
  return (
    <div className="bg-muted border border-border p-4 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      {show ? (
        <>
          <p className="text-xl font-semibold text-foreground leading-none">
            {show.attended}
          </p>
          <p className="text-xs text-muted-foreground mt-2 font-medium truncate">
            {show.eventName}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {show.venueName} •{" "}
            {new Date(show.dateTime).toLocaleDateString("en-US")}
          </p>
        </>
      ) : (
        <p className="text-sm font-medium text-muted-foreground">
          No past shows
        </p>
      )}
    </div>
  );
}

function EventComparisonTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const rsvps = payload.find((item) => item.name === "rsvps")?.value ?? 0;
  const attended = payload.find((item) => item.name === "attended")?.value ?? 0;

  return (
    <div className="bg-card border border-band/40 p-3 rounded-lg">
      <p className="text-foreground font-medium text-xs">{label}</p>
      <p className="text-band text-xs mt-1">RSVPs: {rsvps}</p>
      <p className="text-fan text-xs mt-1">Attended: {attended}</p>
    </div>
  );
}

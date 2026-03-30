import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import {
  BarChart3,
  Calendar,
  ChevronRight,
  Clock3,
  Eye,
  MapPin,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react-native";
import {
  AppScreen,
  EmptyState,
  HeroHeader,
  LoadingPanel,
  SectionCard,
  SectionTitle,
  StatCard,
} from "@/components/ui/AppPrimitives";
import { ChartLegendList, DonutChart, GroupedBarChart } from "@/components/charts/AnalyticsCharts";
import { useBandAnalytics, useCurrentBand } from "@/hooks/useBand";
import {
  ANALYTICS_CHART_COLORS,
  buildAnalyticsLegend,
  type AnalyticsBarDatum,
} from "@/lib/analyticsCharts";
import { formatFullDate, getRelativeTime } from "@ear-plug/shared/constants";

export function BandAnalyticsScreen() {
  const { band, isLoading: bandLoading } = useCurrentBand();
  const { analytics, isLoading: analyticsLoading } = useBandAnalytics(band?._id);
  const [selectedEventIndex, setSelectedEventIndex] = useState(0);
  const [selectedTrafficIndex, setSelectedTrafficIndex] = useState(0);

  const eventComparison = useMemo(
    () => ((analytics?.eventComparison ?? []) as AnalyticsBarDatum[]),
    [analytics?.eventComparison],
  );
  const trafficLegend = useMemo(
    () => buildAnalyticsLegend(analytics?.trafficData ?? []),
    [analytics?.trafficData],
  );
  const selectedEvent = eventComparison[selectedEventIndex] ?? null;
  const hasChartData = eventComparison.length > 0;
  const hasTrafficData = trafficLegend.length > 0;

  useEffect(() => {
    setSelectedEventIndex((current) => Math.min(current, Math.max(eventComparison.length - 1, 0)));
  }, [eventComparison.length]);

  useEffect(() => {
    setSelectedTrafficIndex((current) => Math.min(current, Math.max(trafficLegend.length - 1, 0)));
  }, [trafficLegend.length]);

  if (bandLoading || analyticsLoading) {
    return (
      <AppScreen>
        <LoadingPanel label="Loading analytics..." tone="band" />
      </AppScreen>
    );
  }

  if (!band) {
    return (
      <AppScreen>
        <EmptyState
          tone="band"
          title="No band workspace selected"
          message="Switch to a band workspace from Profile to see performance analytics."
          icon={<BarChart3 size={30} color="#7c3aed" />}
        />
      </AppScreen>
    );
  }

  if (!analytics) {
    return (
      <AppScreen>
        <EmptyState
          tone="band"
          title="Analytics unavailable"
          message="We couldn’t load analytics for this band right now."
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      scroll
      header={
        <HeroHeader
          title="Analytics"
          subtitle={`${band.name} performance, attendance, and audience insights.`}
          eyebrow="Band Workspace"
          tone="band"
        >
          <View className="flex-row gap-2">
            <StatCard
              icon={<Users size={16} color={ANALYTICS_CHART_COLORS.primary} />}
              label="Total RSVPs"
              value={analytics.totalRsvps}
              tone="band"
            />
            <StatCard
              icon={<Calendar size={16} color={ANALYTICS_CHART_COLORS.secondary} />}
              label="Total Shows"
              value={analytics.eventCount}
              tone="neutral"
            />
            <StatCard
              icon={<UserCheck size={16} color={ANALYTICS_CHART_COLORS.accent} />}
              label="Avg Attendance"
              value={Number.isFinite(analytics.averageAttendancePerShow) ? analytics.averageAttendancePerShow.toFixed(1) : "0.0"}
              tone="success"
            />
          </View>
        </HeroHeader>
      }
    >
      <View className="gap-4">
        <SectionCard>
          <SectionTitle
            title="Performance Overview"
            subtitle={`Last updated ${getRelativeTime(Date.now())}`}
          />
          <View className="flex-row gap-2">
            <StatCard
              icon={<TrendingUp size={16} color={ANALYTICS_CHART_COLORS.primary} />}
              label="RSVP Velocity"
              value={analytics.totalRsvps}
              tone="band"
            />
            <StatCard
              icon={<Clock3 size={16} color={ANALYTICS_CHART_COLORS.secondary} />}
              label="Shows Logged"
              value={analytics.eventCount}
              tone="neutral"
            />
          </View>
        </SectionCard>

        <SectionCard>
          <SectionTitle
            title="Show Highlights"
            subtitle="Best and lowest-attended shows from the same analytics payload as web."
          />
          <View className="gap-3">
            <ShowHighlightCard
              label="Best Attendance"
              icon={<Trophy size={16} color="#d97706" />}
              accentClass="bg-amber-50 border-amber-200"
              title={analytics.bestAttendanceShow?.eventName || "No best-attended show yet"}
              subtitle={
                analytics.bestAttendanceShow
                  ? `${analytics.bestAttendanceShow.venueName} • ${analytics.bestAttendanceShow.attended} attended • ${formatFullDate(analytics.bestAttendanceShow.dateTime)}`
                  : "Play more shows to unlock this card."
              }
              attendance={analytics.bestAttendanceShow?.attended}
            />
            <ShowHighlightCard
              label="Lowest Show"
              icon={<TrendingDown size={16} color="#64748b" />}
              accentClass="bg-slate-50 border-slate-200"
              title={analytics.lowestShow?.eventName || "No lowest show yet"}
              subtitle={
                analytics.lowestShow
                  ? `${analytics.lowestShow.venueName} • ${analytics.lowestShow.attended} attended • ${formatFullDate(analytics.lowestShow.dateTime)}`
                  : "Play more shows to unlock this card."
              }
              attendance={analytics.lowestShow?.attended}
            />
          </View>
        </SectionCard>

        <SectionCard>
          <SectionTitle
            title="Event Performance"
            subtitle="RSVPs versus checked-in attendance for recent shows."
          />
          <View className="rounded-[20px] border border-slate-200 bg-slate-50 px-3.5 py-3">
            <View className="mb-3 flex-row items-center justify-between gap-3">
              <View className="flex-row items-center gap-4">
                <LegendSwatch label="RSVPs" color={ANALYTICS_CHART_COLORS.primary} />
                <LegendSwatch label="Attended" color={ANALYTICS_CHART_COLORS.secondary} />
              </View>
              {selectedEvent ? (
                <Text className="text-[11px] font-medium text-slate-500">
                  {selectedEvent.venueName}
                </Text>
              ) : null}
            </View>

            {hasChartData ? (
              <>
                <GroupedBarChart
                  data={eventComparison}
                  selectedIndex={selectedEventIndex}
                  onSelect={setSelectedEventIndex}
                />

                {selectedEvent ? (
                  <View className="mt-3 rounded-[16px] border border-slate-200 bg-white px-3.5 py-3">
                    <Text className="text-sm font-semibold text-slate-950">{selectedEvent.venueName}</Text>
                    <Text className="mt-1 text-xs text-slate-500">
                      {selectedEvent.name} • {selectedEvent.rsvps} RSVPs • {selectedEvent.attended} attended
                    </Text>
                  </View>
                ) : null}
              </>
            ) : (
              <EmptyState
                tone="neutral"
                title="No events to compare"
                message="Complete some shows to see your performance trends."
                icon={<TrendingUp size={24} color="#7c3aed" />}
              />
            )}
          </View>
        </SectionCard>

        <SectionCard>
          <SectionTitle
            title="Audience Breakdown"
            subtitle="Fan discovery sources with readable values outside the chart."
          />
          {hasTrafficData ? (
            <View className="gap-4">
              <View className="items-center rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                <DonutChart
                  data={trafficLegend}
                  selectedIndex={selectedTrafficIndex}
                  onSelect={setSelectedTrafficIndex}
                />
              </View>
              <ChartLegendList
                items={trafficLegend}
                selectedIndex={selectedTrafficIndex}
                onSelect={setSelectedTrafficIndex}
              />
            </View>
          ) : (
            <EmptyState
              tone="neutral"
              title="Not enough data"
              message="Audience insights will appear as fans discover your shows."
              icon={<Eye size={24} color="#2563eb" />}
            />
          )}
        </SectionCard>

        <SectionCard>
          <SectionTitle
            title="Venue Performance"
            subtitle="Show-by-show venue breakdown, matching the web analytics list."
          />
          {hasChartData ? (
            <View className="gap-3">
              {eventComparison.map((event, index) => {
                const active = index === selectedEventIndex;
                return (
                  <View
                    key={`${event.venueName}-${event.name}-${index}`}
                    className={`rounded-[18px] border px-4 py-3.5 ${active ? "border-band/20 bg-band/5" : "border-slate-200 bg-white"}`}
                  >
                    <View className="flex-row items-center justify-between gap-3">
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <MapPin size={14} color={active ? "#7c3aed" : "#64748b"} />
                          <Text className="text-sm font-semibold text-slate-950">{event.venueName}</Text>
                          <ChevronRight size={14} color="#94a3b8" />
                        </View>
                        <Text className="mt-1 text-xs text-slate-500">{event.name}</Text>
                      </View>

                      <View className="flex-row items-center gap-4">
                        <View className="items-end">
                          <Text className="text-lg font-bold text-band">{event.rsvps}</Text>
                          <Text className="text-[11px] text-slate-500">RSVPs</Text>
                        </View>
                        <View className="h-8 w-px bg-slate-200" />
                        <View className="items-end">
                          <Text className="text-lg font-bold text-fan">{event.attended}</Text>
                          <Text className="text-[11px] text-slate-500">Attended</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <EmptyState
              tone="neutral"
              title="No venue breakdown yet"
              message="Venue-level performance appears once your band has completed shows."
              icon={<MapPin size={24} color="#64748b" />}
            />
          )}
        </SectionCard>

        <Text className="pb-2 text-center text-[11px] text-slate-500">
          Analytics generated {formatFullDate(Date.now())}
        </Text>
      </View>
    </AppScreen>
  );
}

function LegendSwatch({ label, color }: { label: string; color: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
      <Text className="text-xs text-slate-500">{label}</Text>
    </View>
  );
}

function ShowHighlightCard({
  label,
  icon,
  accentClass,
  title,
  subtitle,
  attendance,
}: {
  label: string;
  icon: ReactNode;
  accentClass: string;
  title: string;
  subtitle: string;
  attendance?: number;
}) {
  return (
    <View className={`rounded-[18px] border px-4 py-3.5 ${accentClass}`}>
      <View className="mb-3 flex-row items-center gap-2">
        <View className="h-9 w-9 items-center justify-center rounded-[14px] bg-white">{icon}</View>
        <Text className="text-xs font-semibold uppercase tracking-[1.1px] text-slate-500">{label}</Text>
      </View>

      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-sm font-semibold text-slate-950">{title}</Text>
          <Text className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</Text>
        </View>
        {typeof attendance === "number" ? (
          <View className="items-end">
            <Text className="text-2xl font-bold text-slate-950">{attendance}</Text>
            <Text className="text-[11px] text-slate-500">attended</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

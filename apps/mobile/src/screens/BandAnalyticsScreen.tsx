import {
  AppScreen,
  EmptyState,
  HeroHeader,
  LoadingPanel,
  RowLink,
  SectionCard,
  SectionTitle,
  StatCard,
} from "@/components/ui/AppPrimitives";
import { useBandAnalytics, useCurrentBand } from "@/hooks/useBand";
import { formatFullDate } from "@ear-plug/shared/constants";
import {
  VictoryAxis,
  VictoryBar,
  VictoryChart,
  VictoryGroup,
  VictoryLegend,
  VictoryPie,
  VictoryTheme,
  VictoryTooltip,
} from "victory-native";
import { Text, View } from "react-native";

export function BandAnalyticsScreen() {
  const { band } = useCurrentBand();
  const { analytics, isLoading } = useBandAnalytics(band?._id);

  if (!band) {
    return (
      <AppScreen>
        <EmptyState
          tone="band"
          title="No band workspace selected"
          message="Switch to a band workspace from Profile to see performance analytics."
        />
      </AppScreen>
    );
  }

  if (isLoading || !analytics) {
    return <AppScreen><LoadingPanel label="Loading analytics..." tone="band" /></AppScreen>;
  }

  return (
    <AppScreen
      scroll
      header={
        <HeroHeader
          title="Analytics"
          subtitle={`${band.name} performance, attendance, and audience breakdowns.`}
          eyebrow="Band Workspace"
          tone="band"
        >
          <View className="flex-row gap-2">
            <StatCard label="RSVPs" value={String(analytics.totalRsvps)} tone="band" />
            <StatCard label="Shows" value={String(analytics.eventCount)} tone="band" />
            <StatCard
              label="Avg Attendance"
              value={Number.isFinite(analytics.averageAttendancePerShow) ? analytics.averageAttendancePerShow.toFixed(1) : "0.0"}
              tone="band"
            />
          </View>
        </HeroHeader>
      }
    >
      <View className="gap-4">
        <SectionCard>
          <SectionTitle title="Show Highlights" subtitle="Best and lowest-attended shows pulled from the same analytics payload as web." />
          <View className="gap-3">
            <RowLink
              title={analytics.bestAttendanceShow?.eventName || "No best-attended show yet"}
              subtitle={
                analytics.bestAttendanceShow
                  ? `${analytics.bestAttendanceShow.venueName} • ${analytics.bestAttendanceShow.attended} attended • ${formatFullDate(analytics.bestAttendanceShow.dateTime)}`
                  : "Play more shows to unlock this card."
              }
            />
            <RowLink
              title={analytics.lowestShow?.eventName || "No lowest show yet"}
              subtitle={
                analytics.lowestShow
                  ? `${analytics.lowestShow.venueName} • ${analytics.lowestShow.attended} attended • ${formatFullDate(analytics.lowestShow.dateTime)}`
                  : "Play more shows to unlock this card."
              }
            />
          </View>
        </SectionCard>

        <SectionCard>
          <SectionTitle title="Event Performance" subtitle="RSVP versus attended counts for your most recent shows." />
          {analytics.eventComparison.length > 0 ? (
            <View>
              <VictoryChart theme={VictoryTheme.material} domainPadding={{ x: 24, y: 12 }} height={280}>
                <VictoryLegend
                  x={44}
                  y={4}
                  orientation="horizontal"
                  gutter={20}
                  style={{ labels: { fontSize: 11 } }}
                  data={[
                    { name: "RSVPs", symbol: { fill: "#7c3aed" } },
                    { name: "Attended", symbol: { fill: "#2563eb" } },
                  ]}
                />
                <VictoryAxis style={{ tickLabels: { fontSize: 10, angle: -20, padding: 14 } }} />
                <VictoryAxis dependentAxis style={{ tickLabels: { fontSize: 10 } }} />
                <VictoryGroup offset={14} colorScale={["#7c3aed", "#2563eb"]}>
                  <VictoryBar
                    data={analytics.eventComparison}
                    x="name"
                    y="rsvps"
                    labels={({ datum }) => `${datum.rsvps}`}
                    labelComponent={<VictoryTooltip />}
                  />
                  <VictoryBar
                    data={analytics.eventComparison}
                    x="name"
                    y="attended"
                    labels={({ datum }) => `${datum.attended}`}
                    labelComponent={<VictoryTooltip />}
                  />
                </VictoryGroup>
              </VictoryChart>
            </View>
          ) : (
            <Text className="text-sm text-slate-500">No event comparison data yet.</Text>
          )}
        </SectionCard>

        <SectionCard>
          <SectionTitle title="Audience Breakdown" subtitle="Traffic mix represented as a mobile-friendly chart." />
          {analytics.trafficData.some((entry) => entry.value > 0) ? (
            <VictoryPie
              height={280}
              data={analytics.trafficData}
              x="name"
              y="value"
              colorScale={["#7c3aed", "#2563eb", "#10b981", "#f59e0b", "#ef4444"]}
              innerRadius={46}
              labelRadius={82}
              style={{ labels: { fontSize: 10 } }}
            />
          ) : (
            <Text className="text-sm text-slate-500">No audience breakdown data yet.</Text>
          )}
        </SectionCard>
      </View>
    </AppScreen>
  );
}

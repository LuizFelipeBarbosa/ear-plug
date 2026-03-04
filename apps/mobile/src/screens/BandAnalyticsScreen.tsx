import { useBandAnalytics, useCurrentBand } from "@/hooks/useBand";
import { formatFullDate } from "@ear-plug/shared/constants";
import {
  VictoryAxis,
  VictoryBar,
  VictoryChart,
  VictoryLabel,
  VictoryPie,
  VictoryTheme,
  VictoryTooltip,
} from "victory-native";
import { ScrollView, Text, View } from "react-native";

export function BandAnalyticsScreen() {
  const { band } = useCurrentBand();
  const { analytics, isLoading } = useBandAnalytics(band?._id);

  if (!band) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6">
        <Text className="text-gray-500 text-center">Switch to a band workspace to view analytics.</Text>
      </View>
    );
  }

  if (isLoading || !analytics) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-gray-500">Loading analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
      <Text className="text-2xl font-bold text-gray-900">Analytics</Text>
      <Text className="text-sm text-gray-500 mt-1">{band.name}</Text>

      <View className="mt-4 flex-row gap-2">
        <MetricCard label="Total RSVPs" value={String(analytics.totalRsvps)} />
        <MetricCard label="Event Count" value={String(analytics.eventCount)} />
      </View>

      <View className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
        <Text className="text-sm font-semibold text-gray-800">Average Attendance</Text>
        <Text className="text-xl font-bold text-gray-900 mt-1">{analytics.averageAttendancePerShow.toFixed(1)}</Text>
      </View>

      <View className="mt-6 rounded-xl border border-gray-200 p-3">
        <Text className="text-base font-semibold text-gray-900">Event Performance</Text>

        {analytics.eventComparison.length > 0 ? (
          <VictoryChart theme={VictoryTheme.material} domainPadding={{ x: 20 }} height={260}>
            <VictoryAxis style={{ tickLabels: { fontSize: 10, angle: -35, padding: 20 } }} />
            <VictoryAxis dependentAxis style={{ tickLabels: { fontSize: 10 } }} />
            <VictoryBar
              data={analytics.eventComparison}
              x="name"
              y="rsvps"
              style={{ data: { fill: "#7c3aed" } }}
              labels={({ datum }) => `${datum.rsvps}`}
              labelComponent={<VictoryTooltip />}
            />
          </VictoryChart>
        ) : (
          <Text className="text-sm text-gray-500 mt-2">No event comparison data yet.</Text>
        )}
      </View>

      <View className="mt-6 rounded-xl border border-gray-200 p-3">
        <Text className="text-base font-semibold text-gray-900">Audience Breakdown</Text>
        {analytics.trafficData.some((entry) => entry.value > 0) ? (
          <VictoryPie
            height={280}
            data={analytics.trafficData}
            x="name"
            y="value"
            colorScale={["#7c3aed", "#2563eb", "#10b981", "#f59e0b", "#ef4444"]}
            labelRadius={90}
            labelComponent={<VictoryLabel style={{ fontSize: 10 }} />}
          />
        ) : (
          <Text className="text-sm text-gray-500 mt-2">No audience breakdown data yet.</Text>
        )}
      </View>

      <View className="mt-6 rounded-xl border border-gray-200 p-3">
        <Text className="text-base font-semibold text-gray-900">Highlights</Text>
        <Text className="text-sm text-gray-700 mt-2">
          Best attendance: {analytics.bestAttendanceShow ? analytics.bestAttendanceShow.eventName : "N/A"}
        </Text>
        <Text className="text-xs text-gray-500 mt-1">
          {analytics.bestAttendanceShow?.dateTime
            ? formatFullDate(analytics.bestAttendanceShow.dateTime)
            : "No completed shows yet"}
        </Text>

        <Text className="text-sm text-gray-700 mt-3">
          Lowest show: {analytics.lowestShow ? analytics.lowestShow.eventName : "N/A"}
        </Text>
      </View>
    </ScrollView>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <Text className="text-lg font-bold text-gray-900">{value}</Text>
      <Text className="text-xs text-gray-600">{label}</Text>
    </View>
  );
}

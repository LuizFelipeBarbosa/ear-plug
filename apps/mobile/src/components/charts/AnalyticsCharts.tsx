import { useMemo, useState } from "react";
import { LayoutChangeEvent, Pressable, Text, View } from "react-native";
import Svg, { Circle, G, Line, Rect, Text as SvgText } from "react-native-svg";
import {
  ANALYTICS_CHART_COLORS,
  type AnalyticsBarDatum,
  type AnalyticsLegendDatum,
  getAnalyticsDonutSegments,
  getBarChartMax,
  getBarChartTicks,
} from "@/lib/analyticsCharts";

const CHART_FONT_FAMILY = "System";

export function GroupedBarChart({
  data,
  selectedIndex,
  onSelect,
}: {
  data: AnalyticsBarDatum[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const chartHeight = 248;
  const padding = { top: 22, right: 12, bottom: 42, left: 34 };

  const maxValue = useMemo(() => getBarChartMax(data), [data]);
  const ticks = useMemo(() => getBarChartTicks(maxValue), [maxValue]);

  const innerWidth = Math.max(width - padding.left - padding.right, 0);
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const groupWidth = data.length > 0 ? innerWidth / data.length : 0;
  const clusterWidth = Math.min(40, Math.max(groupWidth - 10, 24));
  const gap = 6;
  const barWidth = Math.max((clusterWidth - gap) / 2, 8);

  return (
    <View
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      className="rounded-[20px] bg-white"
    >
      {width > 0 ? (
        <Svg width={width} height={chartHeight}>
          {ticks.map((tick, index) => {
            const y = padding.top + innerHeight - (tick / maxValue) * innerHeight;
            return (
              <G key={`tick-${tick}`}>
                <Line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke={index === 0 ? "#cbd5e1" : ANALYTICS_CHART_COLORS.grid}
                  strokeWidth={1}
                />
                <SvgText
                  x={padding.left - 8}
                  y={y + 4}
                  fontSize={11}
                  fill={ANALYTICS_CHART_COLORS.label}
                  fontFamily={CHART_FONT_FAMILY}
                  textAnchor="end"
                >
                  {tick}
                </SvgText>
              </G>
            );
          })}

          {data.map((datum, index) => {
            const centerX = padding.left + groupWidth * index + groupWidth / 2;
            const startX = centerX - clusterWidth / 2;
            const rsvpHeight = maxValue > 0 ? (datum.rsvps / maxValue) * innerHeight : 0;
            const attendedHeight = maxValue > 0 ? (datum.attended / maxValue) * innerHeight : 0;
            const rsvpY = padding.top + innerHeight - rsvpHeight;
            const attendedY = padding.top + innerHeight - attendedHeight;
            const active = index === selectedIndex;

            return (
              <G key={`${datum.name}-${index}`}>
                <Rect
                  x={padding.left + groupWidth * index}
                  y={padding.top}
                  width={groupWidth}
                  height={innerHeight + padding.bottom}
                  fill="transparent"
                  onPress={() => onSelect(index)}
                />

                <Rect
                  x={startX}
                  y={rsvpY}
                  width={barWidth}
                  height={Math.max(rsvpHeight, 2)}
                  rx={6}
                  fill={ANALYTICS_CHART_COLORS.primary}
                  opacity={active ? 1 : 0.72}
                />
                <Rect
                  x={startX + barWidth + gap}
                  y={attendedY}
                  width={barWidth}
                  height={Math.max(attendedHeight, 2)}
                  rx={6}
                  fill={ANALYTICS_CHART_COLORS.secondary}
                  opacity={active ? 1 : 0.72}
                />

                <SvgText
                  x={startX + barWidth / 2}
                  y={rsvpY - 6}
                  fontSize={10}
                  fill={ANALYTICS_CHART_COLORS.label}
                  fontFamily={CHART_FONT_FAMILY}
                  textAnchor="middle"
                >
                  {datum.rsvps}
                </SvgText>
                <SvgText
                  x={startX + barWidth + gap + barWidth / 2}
                  y={attendedY - 6}
                  fontSize={10}
                  fill={ANALYTICS_CHART_COLORS.label}
                  fontFamily={CHART_FONT_FAMILY}
                  textAnchor="middle"
                >
                  {datum.attended}
                </SvgText>
                <SvgText
                  x={centerX}
                  y={chartHeight - 14}
                  fontSize={11}
                  fontWeight={active ? "700" : "500"}
                  fill={active ? ANALYTICS_CHART_COLORS.text : ANALYTICS_CHART_COLORS.label}
                  fontFamily={CHART_FONT_FAMILY}
                  textAnchor="middle"
                >
                  {datum.name}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      ) : (
        <View className="h-[248px]" />
      )}
    </View>
  );
}

export function DonutChart({
  data,
  selectedIndex,
  onSelect,
}: {
  data: AnalyticsLegendDatum[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const size = 188;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const segments = getAnalyticsDonutSegments(data);
  const selected = data[selectedIndex] ?? data[0];

  let accumulatedPercent = 0;

  return (
    <View className="items-center justify-center">
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {segments.map((segment, index) => {
          const strokeDashoffset = circumference * (1 - accumulatedPercent / 100);
          accumulatedPercent += segment.percent;
          const active = index === selectedIndex;

          return (
            <Circle
              key={`${segment.name}-${index}`}
              cx={center}
              cy={center}
              r={radius}
              stroke={segment.color}
              strokeWidth={active ? strokeWidth + 2 : strokeWidth}
              fill="transparent"
              strokeLinecap="round"
              strokeDasharray={`${(segment.percent / 100) * circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              rotation={-90}
              origin={`${center}, ${center}`}
              opacity={active ? 1 : 0.82}
              onPress={() => onSelect(index)}
            />
          );
        })}
      </Svg>

      {selected ? (
        <View className="absolute items-center">
          <Text className="text-[28px] font-bold tracking-[-0.8px] text-slate-950">{selected.percent}%</Text>
          <Text className="mt-1 text-xs font-semibold uppercase tracking-[1.2px] text-slate-500">
            {selected.name}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function ChartLegendList({
  items,
  selectedIndex,
  onSelect,
}: {
  items: AnalyticsLegendDatum[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <View className="gap-2">
      {items.map((item, index) => {
        const active = index === selectedIndex;

        return (
          <Pressable
            key={`${item.name}-${index}`}
            onPress={() => onSelect(index)}
            className={`rounded-[16px] border px-3.5 py-3 ${active ? "border-slate-300 bg-slate-50" : "border-slate-200 bg-white"}`}
          >
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-row items-center gap-3">
                <View className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <Text className={`text-sm font-medium ${active ? "text-slate-950" : "text-slate-700"}`}>
                  {item.name}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-sm font-semibold text-slate-950">{item.percent}%</Text>
                <Text className="text-[11px] text-slate-500">{item.value}</Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

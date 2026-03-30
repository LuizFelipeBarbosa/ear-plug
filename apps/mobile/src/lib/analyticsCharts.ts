export const ANALYTICS_CHART_COLORS = {
  primary: "#7c3aed",
  primaryLight: "#a78bfa",
  secondary: "#3b82f6",
  secondaryLight: "#60a5fa",
  accent: "#10b981",
  muted: "#64748b",
  grid: "#e2e8f0",
  label: "#475569",
  text: "#0f172a",
} as const;

export interface AnalyticsBarDatum {
  name: string;
  venueName: string;
  rsvps: number;
  attended: number;
}

export interface AnalyticsDonutDatum {
  name: string;
  value: number;
}

export interface AnalyticsLegendDatum extends AnalyticsDonutDatum {
  color: string;
  percent: number;
}

const DONUT_COLORS = [
  ANALYTICS_CHART_COLORS.primary,
  ANALYTICS_CHART_COLORS.secondary,
  ANALYTICS_CHART_COLORS.accent,
  ANALYTICS_CHART_COLORS.primaryLight,
  ANALYTICS_CHART_COLORS.secondaryLight,
] as const;

export function getBarChartMax(data: AnalyticsBarDatum[]): number {
  const maxValue = data.reduce((max, item) => Math.max(max, item.rsvps, item.attended), 0);
  if (maxValue <= 4) return 4;
  if (maxValue <= 10) return 10;
  return Math.ceil(maxValue / 5) * 5;
}

export function getBarChartTicks(maxValue: number, tickCount = 4): number[] {
  return Array.from({ length: tickCount + 1 }, (_, index) => Math.round((maxValue / tickCount) * index));
}

export function buildAnalyticsLegend(data: AnalyticsDonutDatum[]): AnalyticsLegendDatum[] {
  const filtered = data.filter((entry) => entry.value > 0);
  const total = filtered.reduce((sum, entry) => sum + entry.value, 0);
  if (total <= 0) {
    return [];
  }

  return filtered.map((entry, index) => ({
    ...entry,
    color: DONUT_COLORS[index % DONUT_COLORS.length],
    percent: Math.round((entry.value / total) * 100),
  }));
}

export function getAnalyticsDonutSegments(data: AnalyticsLegendDatum[]) {
  return data.map((entry) => ({
    ...entry,
    angle: (entry.percent / 100) * 360,
  }));
}

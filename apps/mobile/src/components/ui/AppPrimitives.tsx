import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight } from "lucide-react-native";
import { cn } from "@/lib/utils";

export { ActivityIndicator };

type RoleTone = "fan" | "band" | "neutral" | "success" | "warning" | "danger";
type ButtonSize = "sm" | "md" | "lg";
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const COLORS = {
  page: "#f8fafc",
  surface: "#ffffff",
  text: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#64748b",
  border: "#e2e8f0",
  fan: "#2563eb",
  band: "#7c3aed",
  success: "#16a34a",
  warning: "#d97706",
  danger: "#ef4444",
} as const;

const TONES: Record<RoleTone, { base: string; soft: string; border: string; text: string }> = {
  fan: { base: COLORS.fan, soft: "#dbeafe", border: "#bfdbfe", text: "#1d4ed8" },
  band: { base: COLORS.band, soft: "#ede9fe", border: "#ddd6fe", text: "#6d28d9" },
  neutral: { base: COLORS.text, soft: "#f8fafc", border: COLORS.border, text: COLORS.textSecondary },
  success: { base: COLORS.success, soft: "#dcfce7", border: "#bbf7d0", text: "#15803d" },
  warning: { base: COLORS.warning, soft: "#fef3c7", border: "#fde68a", text: "#b45309" },
  danger: { base: COLORS.danger, soft: "#fee2e2", border: "#fecaca", text: "#dc2626" },
};

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  raisedShadow: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
});

function toneAccent(tone: RoleTone) {
  return TONES[tone];
}

function toneBorderClass(tone: RoleTone) {
  switch (tone) {
    case "fan":
      return "border-fan/20";
    case "band":
      return "border-band/20";
    case "success":
      return "border-emerald-500/20";
    case "warning":
      return "border-amber-500/20";
    case "danger":
      return "border-red-500/20";
    default:
      return "border-border";
  }
}

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
}

export function AppScreen({ children, scroll = false, header, footer }: ScreenProps) {
  const content = scroll ? (
    <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
      <View className="px-4 pb-8 pt-4">{children}</View>
    </ScrollView>
  ) : (
    <View className="flex-1 px-4 pb-8 pt-4">{children}</View>
  );

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.page }}>
      <View className="flex-1" style={{ backgroundColor: COLORS.page }}>
        {header}
        {content}
        {footer}
      </View>
    </SafeAreaView>
  );
}

interface CardProps {
  children: ReactNode;
  className?: string;
  tone?: RoleTone;
  interactive?: boolean;
}

export function Card({ children, className, tone = "neutral", interactive = false }: CardProps) {
  return (
    <View
      style={styles.cardShadow}
      className={cn(
        "overflow-hidden rounded-[20px] border bg-white",
        toneBorderClass(tone),
        interactive && "active:opacity-95",
        className,
      )}
    >
      {children}
    </View>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <View className="px-4 pb-2 pt-3">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-2xl font-bold tracking-[-0.6px]" style={{ color: COLORS.text }}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="mt-1 text-sm leading-6" style={{ color: COLORS.textMuted }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {action}
      </View>
    </View>
  );
}

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function SectionTitle({ title, subtitle, action }: SectionTitleProps) {
  return (
    <View className="mb-3 flex-row items-start justify-between gap-3">
      <View className="flex-1">
        <Text className="text-base font-semibold tracking-[-0.2px]" style={{ color: COLORS.text }}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-1 text-xs leading-5" style={{ color: COLORS.textMuted }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  tone?: RoleTone;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  tone = "neutral",
  size = "md",
  disabled = false,
  loading = false,
  icon,
  className,
}: ButtonProps) {
  const accent = toneAccent(tone);
  const sizeClasses: Record<ButtonSize, string> = {
    sm: "min-h-[36px] rounded-full px-3.5",
    md: "min-h-[48px] rounded-[18px] px-4",
    lg: "min-h-[52px] rounded-[20px] px-5",
  };
  const textSizes: Record<ButtonSize, string> = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-sm",
  };

  let containerClasses = "border";
  let textColor = "#ffffff";
  let spinnerColor = "#ffffff";

  if (variant === "secondary") {
    containerClasses = "border border-slate-200 bg-white";
    textColor = COLORS.text;
    spinnerColor = COLORS.textSecondary;
  } else if (variant === "ghost") {
    containerClasses = "border border-transparent bg-transparent";
    textColor = tone === "band" ? COLORS.band : tone === "fan" ? COLORS.fan : COLORS.text;
    spinnerColor = accent.text;
  } else if (variant === "danger") {
    containerClasses = "border border-red-500 bg-red-500";
  } else if (tone === "band") {
    containerClasses = "border border-band bg-band";
  } else if (tone === "fan") {
    containerClasses = "border border-fan bg-fan";
  } else if (tone === "success") {
    containerClasses = "border border-emerald-500 bg-emerald-500";
  } else {
    containerClasses = "border border-slate-950 bg-slate-950";
  }

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={disabled || loading}
      style={variant === "primary" || variant === "danger" ? styles.cardShadow : undefined}
      className={cn(
        "flex-row items-center justify-center gap-2",
        sizeClasses[size],
        containerClasses,
        (disabled || loading) && "opacity-50",
        className,
      )}
    >
      {loading ? <ActivityIndicator size="small" color={spinnerColor} /> : icon}
      <Text className={cn("font-semibold", textSizes[size])} style={{ color: textColor }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export const ActionButton = Button;

interface IconButtonProps {
  icon: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  tone?: RoleTone;
  size?: "sm" | "md";
  disabled?: boolean;
  accessibilityLabel: string;
}

export function IconButton({
  icon,
  onPress,
  variant = "secondary",
  tone = "neutral",
  size = "md",
  disabled = false,
  accessibilityLabel,
}: IconButtonProps) {
  const sizeClass = size === "sm" ? "h-10 w-10 rounded-[16px]" : "h-11 w-11 rounded-[18px]";
  const classes =
    variant === "primary"
      ? tone === "band"
        ? "border-band bg-band"
        : tone === "fan"
          ? "border-fan bg-fan"
          : "border-slate-950 bg-slate-950"
      : variant === "danger"
        ? "border-red-500 bg-red-500"
        : variant === "ghost"
          ? "border-transparent bg-transparent"
          : "border-slate-200 bg-white";

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      style={variant === "primary" || variant === "danger" ? styles.cardShadow : undefined}
      className={cn("items-center justify-center border", sizeClass, classes, disabled && "opacity-50")}
    >
      {icon}
    </TouchableOpacity>
  );
}

interface PillButtonProps {
  label: string;
  active?: boolean;
  tone?: RoleTone;
  onPress: () => void;
}

export function PillButton({ label, active = false, tone = "neutral", onPress }: PillButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      className={cn(
        "mr-2 rounded-full border px-3.5 py-2",
        active
          ? tone === "band"
            ? "border-band/25 bg-band/10"
            : tone === "fan"
              ? "border-fan/25 bg-fan/10"
              : "border-slate-300 bg-slate-100"
          : "border-slate-200 bg-white",
      )}
    >
      <Text
        className="text-xs font-semibold"
        style={{ color: active ? (tone === "band" ? COLORS.band : tone === "fan" ? COLORS.fan : COLORS.text) : COLORS.textSecondary }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

interface StatCardProps {
  icon?: ReactNode;
  value: string | number;
  label: string;
  tone?: RoleTone;
  highlight?: boolean;
}

export function StatCard({ icon, value, label, tone = "neutral", highlight = false }: StatCardProps) {
  return (
    <View
      style={styles.cardShadow}
      className={cn(
        "flex-1 rounded-[20px] border bg-white px-4 py-3.5",
        highlight ? "border-slate-300" : toneBorderClass(tone),
      )}
    >
      {icon ? <View className="mb-2 h-8 w-8 items-center justify-center rounded-[12px] bg-slate-50">{icon}</View> : null}
      <Text className="text-2xl font-bold tracking-[-0.6px]" style={{ color: COLORS.text }}>
        {value}
      </Text>
      <Text className="mt-1 text-[11px] font-semibold uppercase tracking-[1px]" style={{ color: COLORS.textMuted }}>
        {label}
      </Text>
    </View>
  );
}

interface BadgeProps {
  label: string;
  tone?: RoleTone;
  variant?: "default" | "outline";
}

export function Badge({ label, tone = "neutral", variant = "default" }: BadgeProps) {
  const accent = toneAccent(tone);

  return (
    <View
      className="self-start rounded-full border px-2.5 py-1"
      style={{
        borderColor: accent.border,
        backgroundColor: variant === "outline" ? COLORS.surface : accent.soft,
      }}
    >
      <Text className="text-[10px] font-bold uppercase tracking-[1.2px]" style={{ color: accent.text }}>
        {label}
      </Text>
    </View>
  );
}

export function MiniBadge({ label, tone = "neutral" }: { label: string; tone?: RoleTone }) {
  return <Badge label={label} tone={tone} />;
}

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: ReactNode;
  action?: ReactNode;
  tone?: RoleTone;
}

export function EmptyState({ title, message, icon, action, tone = "neutral" }: EmptyStateProps) {
  return (
    <SectionCard tone={tone}>
      <View className="items-center py-6">
        {icon ? <View className="mb-4">{icon}</View> : null}
        <Text className="text-center text-lg font-semibold tracking-[-0.2px]" style={{ color: COLORS.text }}>
          {title}
        </Text>
        <Text className="mt-2 max-w-[280px] text-center text-sm leading-6" style={{ color: COLORS.textMuted }}>
          {message}
        </Text>
        {action ? <View className="mt-5 w-full">{action}</View> : null}
      </View>
    </SectionCard>
  );
}

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Loading..." }: LoadingStateProps) {
  return <LoadingPanel label={label} tone="neutral" />;
}

interface SegmentedTabsProps {
  value: string;
  options: { value: string; label: string; count?: number }[];
  tone?: RoleTone;
  onChange: (value: string) => void;
}

export function SegmentedTabs({ value, options, tone = "neutral", onChange }: SegmentedTabsProps) {
  return (
    <View style={styles.cardShadow} className="overflow-hidden rounded-[20px] border border-slate-200 bg-white p-1.5">
      <View className="flex-row flex-wrap gap-1.5">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <TouchableOpacity
              key={option.value}
              activeOpacity={0.9}
              onPress={() => onChange(option.value)}
              className={cn(
                "min-w-[72px] flex-1 rounded-[16px] px-3 py-2.5",
                active
                  ? tone === "band"
                    ? "bg-band"
                    : tone === "fan"
                      ? "bg-fan"
                      : "bg-slate-950"
                  : "bg-slate-50",
              )}
            >
              <Text className="text-center text-sm font-semibold" style={{ color: active ? "#ffffff" : COLORS.textSecondary }}>
                {option.label}
              </Text>
              {typeof option.count === "number" ? (
                <Text className="mt-0.5 text-center text-[11px]" style={{ color: active ? "rgba(255,255,255,0.72)" : COLORS.textMuted }}>
                  {option.count}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

interface RowLinkProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  icon?: ReactNode;
  onPress?: () => void;
}

export function RowLink({ title, subtitle, right, icon, onPress }: RowLinkProps) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.cardShadow}
      className="rounded-[20px] border border-slate-200 bg-white px-4 py-3"
    >
      <View className="flex-row items-center gap-3">
        {icon ? <View className="h-11 w-11 items-center justify-center rounded-[16px] bg-slate-50">{icon}</View> : null}
        <View className="flex-1 min-w-0">
          <Text className="text-sm font-semibold" numberOfLines={1} style={{ color: COLORS.text }}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="mt-1 text-xs leading-5" numberOfLines={2} style={{ color: COLORS.textMuted }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ?? <ChevronRight size={16} color="#94a3b8" />}
      </View>
    </Pressable>
  );
}

interface AvatarProps {
  uri?: string | null;
  label: string;
  size?: "sm" | "md" | "lg" | number;
  tone?: RoleTone;
}

export function Avatar({ uri, label, size = "md", tone = "neutral" }: AvatarProps) {
  const initials =
    label
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "EP";

  const sizeClasses =
    typeof size === "number"
      ? size <= 40
        ? { container: "h-10 w-10 rounded-[14px]", text: "text-xs" }
        : size <= 56
          ? { container: "h-12 w-12 rounded-[16px]", text: "text-sm" }
          : { container: "h-16 w-16 rounded-[20px]", text: "text-base" }
      : size === "sm"
        ? { container: "h-10 w-10 rounded-[14px]", text: "text-xs" }
        : size === "lg"
          ? { container: "h-16 w-16 rounded-[20px]", text: "text-base" }
          : { container: "h-12 w-12 rounded-[16px]", text: "text-sm" };

  const accent = toneAccent(tone);

  return (
    <View className={cn("items-center justify-center overflow-hidden border", sizeClasses.container)} style={{ borderColor: accent.border, backgroundColor: accent.soft }}>
      {uri ? (
        <Image source={{ uri }} className={sizeClasses.container} resizeMode="cover" />
      ) : (
        <Text className={cn("font-semibold", sizeClasses.text)} style={{ color: accent.text }}>
          {initials}
        </Text>
      )}
    </View>
  );
}

interface ListItemProps {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
}

export function ListItem({ title, subtitle, leading, trailing, onPress }: ListItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.cardShadow}
      className="rounded-[20px] border border-slate-200 bg-white px-4 py-3"
    >
      <View className="flex-row items-center gap-3">
        {leading}
        <View className="flex-1 min-w-0">
          <Text className="text-sm font-semibold" style={{ color: COLORS.text }}>
            {title}
          </Text>
          {subtitle ? <Text className="mt-1 text-xs leading-5" style={{ color: COLORS.textMuted }}>{subtitle}</Text> : null}
        </View>
        {trailing}
      </View>
    </Pressable>
  );
}

interface SectionCardProps {
  children: ReactNode;
  tone?: RoleTone;
  padded?: boolean;
}

export function SectionCard({ children, tone = "neutral", padded = true }: SectionCardProps) {
  return (
    <View
      style={styles.cardShadow}
      className={cn("overflow-hidden rounded-[20px] border bg-white", toneBorderClass(tone), padded && "p-4")}
    >
      {children}
    </View>
  );
}

interface HeroHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  tone?: RoleTone;
  action?: ReactNode;
  children?: ReactNode;
}

export function HeroHeader({ title, subtitle, eyebrow, tone = "neutral", action, children }: HeroHeaderProps) {
  const accent = toneAccent(tone);

  return (
    <View className="overflow-hidden border-b border-slate-200/80 px-4 pb-4 pt-3" style={{ backgroundColor: COLORS.page }}>
      <View className="absolute right-[-36px] top-[-20px] h-36 w-36 rounded-full opacity-60" style={{ backgroundColor: accent.soft }} />
      <View className="relative">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            {eyebrow ? <Badge label={eyebrow} tone={tone} /> : null}
            <Text className="mt-3 text-[28px] font-bold tracking-[-0.8px]" style={{ color: COLORS.text }}>
              {title}
            </Text>
            {subtitle ? (
              <Text className="mt-2 max-w-[320px] text-sm leading-6" style={{ color: COLORS.textMuted }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {action ? <View className="mt-1">{action}</View> : null}
        </View>

        {children ? <View className="mt-4 gap-3">{children}</View> : null}
      </View>
    </View>
  );
}

export function LoadingPanel({ label = "Loading...", tone = "neutral" }: { label?: string; tone?: RoleTone }) {
  const accent = toneAccent(tone);

  return (
    <SectionCard tone={tone}>
      <View className="items-center py-8">
        <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: accent.soft }}>
          <ActivityIndicator size="small" color={accent.base} />
        </View>
        <Text className="mt-4 text-sm font-medium" style={{ color: COLORS.textMuted }}>
          {label}
        </Text>
      </View>
    </SectionCard>
  );
}

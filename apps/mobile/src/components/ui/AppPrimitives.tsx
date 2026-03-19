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

const TONES: Record<RoleTone, { base: string; soft: string; border: string; text: string }> = {
  fan: { base: "#2563eb", soft: "#dbeafe", border: "#bfdbfe", text: "#1d4ed8" },
  band: { base: "#7c3aed", soft: "#ede9fe", border: "#ddd6fe", text: "#6d28d9" },
  neutral: { base: "#0f172a", soft: "#f8fafc", border: "#e2e8f0", text: "#475569" },
  success: { base: "#16a34a", soft: "#dcfce7", border: "#bbf7d0", text: "#15803d" },
  warning: { base: "#d97706", soft: "#fef3c7", border: "#fcd34d", text: "#b45309" },
  danger: { base: "#ef4444", soft: "#fee2e2", border: "#fecaca", text: "#dc2626" },
};

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  floatingShadow: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
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
      return "border-emerald-500/25";
    case "warning":
      return "border-amber-500/25";
    case "danger":
      return "border-red-500/25";
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
    <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 132 }}>
      <View className="px-4 pb-8 pt-4">{children}</View>
    </ScrollView>
  ) : (
    <View className="flex-1 px-4 pb-8 pt-4">{children}</View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      <View className="flex-1 bg-[#f8fafc]">
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
        "overflow-hidden rounded-[24px] border bg-card",
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
          <Text className="text-[28px] font-bold tracking-[-0.6px] text-slate-950">{title}</Text>
          {subtitle ? <Text className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</Text> : null}
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
        <Text className="text-[15px] font-semibold tracking-[-0.2px] text-slate-950">{title}</Text>
        {subtitle ? <Text className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</Text> : null}
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
    sm: "min-h-[40px] rounded-2xl px-3.5 py-2",
    md: "min-h-[46px] rounded-[18px] px-4 py-3",
    lg: "min-h-[52px] rounded-[20px] px-5 py-3.5",
  };
  const textSizes: Record<ButtonSize, string> = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-sm",
  };

  let containerClasses = "border";
  let textClasses = "text-white";
  let spinnerColor = "#ffffff";

  if (variant === "secondary") {
    containerClasses = "border border-slate-200 bg-white";
    textClasses = "text-slate-900";
    spinnerColor = "#475569";
  } else if (variant === "ghost") {
    containerClasses = "border border-transparent bg-transparent";
    textClasses = tone === "neutral" ? "text-slate-900" : tone === "band" ? "text-band" : tone === "fan" ? "text-fan" : "text-slate-900";
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
      activeOpacity={0.88}
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
      <Text className={cn("font-semibold tracking-[0.1px]", textSizes[size], textClasses)}>{label}</Text>
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
  const sizeClass = size === "sm" ? "h-10 w-10 rounded-2xl" : "h-11 w-11 rounded-[18px]";
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
      activeOpacity={0.88}
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
      activeOpacity={0.85}
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
        className={cn(
          "text-xs font-semibold",
          active
            ? tone === "band"
              ? "text-band"
              : tone === "fan"
                ? "text-fan"
                : "text-slate-900"
            : "text-slate-500",
        )}
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
        "flex-1 rounded-[22px] border bg-white px-4 py-3.5",
        highlight ? "border-slate-300" : toneBorderClass(tone),
      )}
    >
      {icon ? <View className="mb-2 h-9 w-9 items-center justify-center rounded-2xl bg-slate-50">{icon}</View> : null}
      <Text className="text-[24px] font-bold tracking-[-0.6px] text-slate-950">{value}</Text>
      <Text className="mt-1 text-[11px] font-semibold uppercase tracking-[1.1px] text-slate-500">{label}</Text>
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
      className={cn(
        "self-start rounded-full border px-2.5 py-1",
        variant === "outline" ? "bg-white" : "",
      )}
      style={{
        borderColor: accent.border,
        backgroundColor: variant === "outline" ? "#ffffff" : accent.soft,
      }}
    >
      <Text className="text-[10px] font-bold uppercase tracking-[1.3px]" style={{ color: accent.text }}>
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
        <Text className="text-center text-lg font-semibold tracking-[-0.3px] text-slate-950">{title}</Text>
        <Text className="mt-2 max-w-[280px] text-center text-sm leading-6 text-slate-500">{message}</Text>
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
    <View style={styles.cardShadow} className="overflow-hidden rounded-[22px] border border-slate-200 bg-white p-1.5">
      <View className="flex-row flex-wrap gap-1.5">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <TouchableOpacity
              key={option.value}
              activeOpacity={0.85}
              onPress={() => onChange(option.value)}
              className={cn(
                "min-w-[76px] flex-1 rounded-[16px] px-3 py-2.5",
                active
                  ? tone === "band"
                    ? "bg-band"
                    : tone === "fan"
                      ? "bg-fan"
                      : "bg-slate-950"
                  : "bg-slate-50",
              )}
            >
              <Text className={cn("text-center text-sm font-semibold", active ? "text-white" : "text-slate-600")}>
                {option.label}
              </Text>
              {typeof option.count === "number" ? (
                <Text className={cn("mt-0.5 text-center text-[11px]", active ? "text-white/70" : "text-slate-400")}>
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
      className="rounded-[20px] border border-slate-200 bg-white px-4 py-3.5"
    >
      <View className="flex-row items-center gap-3">
        {icon ? <View className="h-11 w-11 items-center justify-center rounded-2xl bg-slate-50">{icon}</View> : null}
        <View className="flex-1 min-w-0">
          <Text className="text-sm font-semibold text-slate-950" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="mt-1 text-xs leading-5 text-slate-500" numberOfLines={2}>
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
        ? { container: "h-10 w-10 rounded-2xl", text: "text-xs" }
        : size <= 56
          ? { container: "h-12 w-12 rounded-[18px]", text: "text-sm" }
          : { container: "h-16 w-16 rounded-[22px]", text: "text-base" }
      : size === "sm"
        ? { container: "h-10 w-10 rounded-2xl", text: "text-xs" }
        : size === "lg"
          ? { container: "h-16 w-16 rounded-[22px]", text: "text-base" }
          : { container: "h-12 w-12 rounded-[18px]", text: "text-sm" };

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
      className="rounded-[20px] border border-slate-200 bg-white px-4 py-3.5"
    >
      <View className="flex-row items-center gap-3">
        {leading}
        <View className="flex-1 min-w-0">
          <Text className="text-sm font-semibold text-slate-950">{title}</Text>
          {subtitle ? <Text className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</Text> : null}
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
      className={cn("overflow-hidden rounded-[26px] border bg-white", toneBorderClass(tone), padded && "p-4")}
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
    <View className="overflow-hidden border-b border-slate-200/80 bg-[#f8fafc] px-4 pb-4 pt-3">
      <View className="absolute -top-16 right-[-64px] h-48 w-48 rounded-full opacity-70" style={{ backgroundColor: accent.soft }} />
      <View className="absolute -top-6 left-[-32px] h-24 w-24 rounded-full bg-white/60" />

      <View className="relative">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            {eyebrow ? <Badge label={eyebrow} tone={tone} /> : null}
            <Text className="mt-3 text-[31px] font-bold tracking-[-1px] text-slate-950">{title}</Text>
            {subtitle ? <Text className="mt-2 max-w-[320px] text-sm leading-6 text-slate-500">{subtitle}</Text> : null}
          </View>
          {action ? <View className="mt-1">{action}</View> : null}
        </View>

        {children ? <View className="mt-5 gap-3">{children}</View> : null}
      </View>
    </View>
  );
}

export function LoadingPanel({ label = "Loading...", tone = "neutral" }: { label?: string; tone?: RoleTone }) {
  const accent = toneAccent(tone);

  return (
    <SectionCard tone={tone}>
      <View className="items-center py-8">
        <View className="h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: accent.soft }}>
          <ActivityIndicator size="small" color={accent.base} />
        </View>
        <Text className="mt-4 text-sm font-medium text-slate-500">{label}</Text>
      </View>
    </SectionCard>
  );
}

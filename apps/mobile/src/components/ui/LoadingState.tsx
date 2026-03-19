import { AppScreen, LoadingPanel } from "@/components/ui/AppPrimitives";

export function LoadingState({
  label = "Loading...",
  tone = "fan",
}: {
  label?: string;
  tone?: "fan" | "band" | "neutral";
}) {
  return (
    <AppScreen>
      <LoadingPanel label={label} tone={tone} />
    </AppScreen>
  );
}

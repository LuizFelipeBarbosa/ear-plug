import { BandAnalyticsScreen } from "@/screens/BandAnalyticsScreen";
import { AppScreen, EmptyState } from "@/components/ui/AppPrimitives";
import { useProfileContext } from "@/context/ProfileContext";

export default function AnalyticsTabScreen() {
  const { mode } = useProfileContext();

  if (mode === "personal") {
    return (
      <AppScreen>
        <EmptyState
          tone="band"
          title="Band workspace required"
          message="Switch to a band workspace to view analytics."
        />
      </AppScreen>
    );
  }

  return <BandAnalyticsScreen />;
}

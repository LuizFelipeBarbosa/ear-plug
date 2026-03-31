import { UserProfile } from "@clerk/nextjs";
import { Music, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { WEB_AUTH_CLERK_APPEARANCE } from "@/components/auth/clerkAppearance";
import { SpotifyReconnectButton } from "./SpotifyReconnectButton";

export default function SpotifyConnectionsPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-fan/30 hover:text-fan"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Profile
        </Link>

        <div className="rounded-[28px] border border-border bg-card/95 p-5 shadow-soft backdrop-blur-xl sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-fan/20 bg-fan/10">
              <Music className="h-5 w-5 text-fan" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-fan/80">
                Connected Accounts
              </p>
              <h1 className="mt-1 text-xl font-bold text-foreground">
                Manage Spotify Access
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Connect Spotify here, then return to Profile and run a taste
                sync to personalize local show recommendations.
              </p>
            </div>
          </div>

          <div className="mb-5">
            <SpotifyReconnectButton />
          </div>

          <UserProfile
            additionalOAuthScopes={{
              spotify: ["user-top-read", "user-follow-read"],
            }}
            appearance={WEB_AUTH_CLERK_APPEARANCE}
            path="/profile/connections"
            routing="path"
          />
        </div>
      </div>
    </div>
  );
}

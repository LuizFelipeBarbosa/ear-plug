import { ConvexError, v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { requireAuthenticatedUser } from "./utils/permissions";

const GENRE_VALUES = [
  "indie",
  "rock",
  "jazz",
  "electronic",
  "folk",
  "pop",
  "alternative",
] as const;
type GenreValue = (typeof GENRE_VALUES)[number];

const CLERK_USERS_API_BASE = "https://api.clerk.com/v1/users";
const SPOTIFY_PROVIDER = "spotify";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const SPOTIFY_TOP_ARTISTS_LIMIT = 10;
const SPOTIFY_FOLLOWED_ARTISTS_LIMIT = 50;
const SPOTIFY_ARTIST_PREVIEW_LIMIT = 5;
const SPOTIFY_MATCH_SCAN_LIMIT = 500;

type SpotifyTopArtistPreview = {
  spotifyArtistId: string;
  name: string;
  imageUrl?: string;
  externalUrl?: string;
};

type MatchedBandPreview = {
  bandId: Id<"bands">;
  name: string;
  image?: string;
  location: string;
};

type SpotifyArtist = {
  id: string;
  name: string;
  genres?: string[];
  images?: Array<{ url?: string }>;
  external_urls?: {
    spotify?: string;
  };
};

type ClerkOauthAccessTokenResponse = {
  data?: Array<{
    token?: string;
  }>;
};

type SpotifyTopArtistsResponse = {
  items?: SpotifyArtist[];
};

type SpotifyFollowedArtistsResponse = {
  artists?: {
    items?: SpotifyArtist[];
  };
};

const SPOTIFY_GENRE_KEYWORDS: Array<{
  genre: GenreValue;
  keywords: readonly string[];
}> = [
  {
    genre: "jazz",
    keywords: ["jazz", "bebop", "swing", "fusion", "big band"],
  },
  {
    genre: "electronic",
    keywords: [
      "electronic",
      "house",
      "techno",
      "dance",
      "edm",
      "ambient",
      "club",
      "bass",
      "trance",
      "drum and bass",
      "dubstep",
      "disco",
      "synthwave",
    ],
  },
  {
    genre: "folk",
    keywords: [
      "folk",
      "acoustic",
      "americana",
      "bluegrass",
      "singer-songwriter",
      "country folk",
    ],
  },
  {
    genre: "indie",
    keywords: [
      "indie",
      "shoegaze",
      "dream pop",
      "lo-fi",
      "bedroom pop",
    ],
  },
  {
    genre: "alternative",
    keywords: [
      "alternative",
      "post-punk",
      "new wave",
      "goth",
      "industrial",
      "alt ",
    ],
  },
  {
    genre: "rock",
    keywords: [
      "rock",
      "punk",
      "metal",
      "hardcore",
      "garage",
      "grunge",
      "emo",
      "psych rock",
    ],
  },
  {
    genre: "pop",
    keywords: ["pop", "electropop", "synthpop", "dance pop", "hyperpop"],
  },
];

function normalizeSpotifyMatchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSpotifyArtistId(url?: string | null): string | null {
  if (!url) return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("spotify:artist:")) {
    const id = trimmed.slice("spotify:artist:".length).trim();
    return id.length > 0 ? id : null;
  }

  try {
    const parsed = new URL(trimmed);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts[0] !== "artist" || !parts[1]) {
      return null;
    }
    return parts[1];
  } catch {
    return null;
  }
}

function mapSpotifyGenreLabelToEarPlugGenre(label: string): GenreValue | null {
  const normalized = label.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  for (const entry of SPOTIFY_GENRE_KEYWORDS) {
    if (entry.keywords.some((keyword) => normalized.includes(keyword))) {
      return entry.genre;
    }
  }

  return null;
}

function buildSpotifyTopGenres(artists: SpotifyArtist[]): GenreValue[] {
  const weightedCounts = new Map<GenreValue, number>();

  artists.forEach((artist, index) => {
    const weight = Math.max(artists.length - index, 1);
    const mappedGenres = new Set<GenreValue>();

    for (const rawGenre of artist.genres ?? []) {
      const mapped = mapSpotifyGenreLabelToEarPlugGenre(rawGenre);
      if (mapped) {
        mappedGenres.add(mapped);
      }
    }

    for (const genre of mappedGenres) {
      weightedCounts.set(genre, (weightedCounts.get(genre) ?? 0) + weight);
    }
  });

  return Array.from(weightedCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([genre]) => genre)
    .slice(0, 5);
}

function buildSpotifyTopArtistPreview(
  artists: SpotifyArtist[],
): SpotifyTopArtistPreview[] {
  return artists.slice(0, SPOTIFY_ARTIST_PREVIEW_LIMIT).map((artist) => ({
    spotifyArtistId: artist.id,
    name: artist.name,
    imageUrl: artist.images?.[0]?.url,
    externalUrl: artist.external_urls?.spotify,
  }));
}

function matchBandsFromSpotifyArtists(
  bands: Doc<"bands">[],
  artists: SpotifyArtist[],
): Id<"bands">[] {
  const artistIds = new Set<string>();
  const normalizedNames = new Set<string>();

  for (const artist of artists) {
    if (artist.id) {
      artistIds.add(artist.id);
    }

    const normalizedName = normalizeSpotifyMatchText(artist.name);
    if (normalizedName) {
      normalizedNames.add(normalizedName);
    }
  }

  const matchedBandIds = new Set<Id<"bands">>();

  for (const band of bands) {
    const spotifyArtistId = extractSpotifyArtistId(band.socialLinks?.spotify);
    if (spotifyArtistId && artistIds.has(spotifyArtistId)) {
      matchedBandIds.add(band._id);
      continue;
    }

    const normalizedBandName = normalizeSpotifyMatchText(band.name);
    if (normalizedBandName && normalizedNames.has(normalizedBandName)) {
      matchedBandIds.add(band._id);
    }
  }

  return Array.from(matchedBandIds);
}

async function getClerkErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as
      | { errors?: Array<{ message?: string }> }
      | { message?: string };

    if ("errors" in payload && Array.isArray(payload.errors)) {
      const firstMessage = payload.errors.find(
        (error) => typeof error.message === "string" && error.message.length > 0,
      )?.message;
      if (firstMessage) {
        return firstMessage;
      }
    }

    if ("message" in payload && typeof payload.message === "string") {
      return payload.message;
    }
  } catch {
    // Ignore non-JSON error responses.
  }

  return `Clerk request failed with status ${response.status}.`;
}

async function getClerkSpotifyAccessToken(
  clerkUserId: string,
): Promise<string> {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) {
    throw new Error(
      "CLERK_SECRET_KEY is required in Convex environment to sync Spotify taste.",
    );
  }

  const response = await fetch(
    `${CLERK_USERS_API_BASE}/${encodeURIComponent(clerkUserId)}/oauth_access_tokens/${SPOTIFY_PROVIDER}`,
    {
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (response.status === 404) {
    throw new ConvexError({
      code: "spotify_not_connected",
      message:
        "Connect Spotify in account settings before syncing personalization.",
    });
  }

  if (!response.ok) {
    throw new ConvexError({
      code: "spotify_sync_failed",
      message: await getClerkErrorMessage(response),
    });
  }

  const payload = (await response.json()) as ClerkOauthAccessTokenResponse;
  const token = payload.data?.find((entry) => typeof entry.token === "string")
    ?.token;

  if (!token) {
    throw new ConvexError({
      code: "spotify_not_connected",
      message:
        "Connect Spotify in account settings before syncing personalization.",
    });
  }

  return token;
}

async function fetchSpotifyJson<T>(
  accessToken: string,
  pathname: string,
  searchParams?: Record<string, string>,
): Promise<T> {
  const url = new URL(`${SPOTIFY_API_BASE}${pathname}`);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    let message = `Spotify request failed with status ${response.status}.`;
    try {
      const payload = (await response.json()) as {
        error?: {
          message?: string;
        };
      };
      if (payload.error?.message) {
        message = payload.error.message;
      }
    } catch {
      // Ignore non-JSON error payloads.
    }

    throw new ConvexError({
      code: "spotify_sync_failed",
      message,
    });
  }

  return (await response.json()) as T;
}

/**
 * Returns the current user's stored Spotify personalization summary.
 */
export const getSpotifyPersonalization = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthenticatedUser(ctx);
    const spotifyProfile = await ctx.db
      .query("spotifyProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (!spotifyProfile) {
      return null;
    }

    const matchedBands = (
      await Promise.all(
        spotifyProfile.matchedBandIds.slice(0, 6).map(async (bandId) => {
          const band = await ctx.db.get(bandId);
          if (!band) return null;

          return {
            bandId: band._id,
            name: band.name,
            image: band.image,
            location: band.location,
          };
        }),
      )
    ).filter((band): band is NonNullable<typeof band> => band !== null);

    return {
      lastSyncedAt: spotifyProfile.lastSyncedAt,
      topGenres: spotifyProfile.topGenres,
      topArtists: spotifyProfile.topArtists,
      matchedBandIds: spotifyProfile.matchedBandIds,
      matchedBands,
      matchedBandCount: spotifyProfile.matchedBandIds.length,
    };
  },
});

/**
 * Syncs derived fan taste data from the current user's Spotify connection.
 */
export const syncSpotifyPersonalization: ReturnType<typeof action> = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.runQuery(api.users.getCurrentUser, {});
    if (!user) {
      throw new Error("User not found");
    }

    const accessToken = await getClerkSpotifyAccessToken(identity.subject);
    const [
      topArtistsPayload,
      followedArtistsPayload,
      allBands,
    ]: [SpotifyTopArtistsResponse, SpotifyFollowedArtistsResponse, Doc<"bands">[]] =
      await Promise.all([
        fetchSpotifyJson<SpotifyTopArtistsResponse>(accessToken, "/me/top/artists", {
          limit: `${SPOTIFY_TOP_ARTISTS_LIMIT}`,
          time_range: "medium_term",
        }),
        fetchSpotifyJson<SpotifyFollowedArtistsResponse>(accessToken, "/me/following", {
          type: "artist",
          limit: `${SPOTIFY_FOLLOWED_ARTISTS_LIMIT}`,
        }),
        ctx.runQuery(api.bands.list, { limit: SPOTIFY_MATCH_SCAN_LIMIT }),
      ]);

    const bands: Doc<"bands">[] = allBands ?? [];
    const topArtists = topArtistsPayload.items ?? [];
    const followedArtists = followedArtistsPayload.artists?.items ?? [];
    const artistsForMatching = [
      ...topArtists,
      ...followedArtists.filter(
        (artist) => !topArtists.some((topArtist) => topArtist.id === artist.id),
      ),
    ];

    const topGenres = buildSpotifyTopGenres(topArtists);
    const topArtistPreview = buildSpotifyTopArtistPreview(topArtists);
    const matchedBandIds = matchBandsFromSpotifyArtists(bands, artistsForMatching);
    const lastSyncedAt = Date.now();

    await ctx.runMutation(internal.spotifyInternal.upsertSpotifyPersonalization, {
      userId: user._id,
      lastSyncedAt,
      topGenres,
      topArtists: topArtistPreview,
      matchedBandIds,
    });

    const matchedBands: MatchedBandPreview[] = bands
      .filter((band) => matchedBandIds.includes(band._id))
      .slice(0, 6)
      .map((band) => ({
        bandId: band._id,
        name: band.name,
        image: band.image,
        location: band.location,
      }));

    return {
      lastSyncedAt,
      topGenres,
      topArtists: topArtistPreview,
      matchedBandIds,
      matchedBands,
      matchedBandCount: matchedBandIds.length,
    };
  },
});

/**
 * Clears the current user's stored Spotify personalization state.
 */
export const clearSpotifyPersonalization = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthenticatedUser(ctx);
    const existingProfile = await ctx.db
      .query("spotifyProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (existingProfile) {
      await ctx.db.delete(existingProfile._id);
    }

    return { cleared: Boolean(existingProfile) };
  },
});

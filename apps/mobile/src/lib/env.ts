const REQUIRED_ENV = [
  "EXPO_PUBLIC_CONVEX_URL",
  "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY",
] as const;

export type RequiredEnvKey = (typeof REQUIRED_ENV)[number];

const ENV_VALUES: Record<RequiredEnvKey, string | undefined> = {
  EXPO_PUBLIC_CONVEX_URL: process.env.EXPO_PUBLIC_CONVEX_URL,
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
};

export function getMissingRequiredEnv(): RequiredEnvKey[] {
  return REQUIRED_ENV.filter((key) => {
    const value = ENV_VALUES[key];
    return !value || value.trim().length === 0;
  });
}

export function getEnv(key: RequiredEnvKey): string {
  const value = ENV_VALUES[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

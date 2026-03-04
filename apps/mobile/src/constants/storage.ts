export const STORAGE_KEYS = {
  profileContext: "ear-plug-mobile-profile-context-v1",
  onboardingCompletePrefix: "ear-plug-mobile-onboarding-complete",
} as const;

export function onboardingStorageKey(userId: string): string {
  return `${STORAGE_KEYS.onboardingCompletePrefix}:${userId}`;
}

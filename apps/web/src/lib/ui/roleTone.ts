import { cn } from "@/lib/utils";
export type RoleTone = "fan" | "band";
export type ColorStrategy = "role" | "genre";
export const ROLE_ACCENT = {
  fan: {
    text: "text-fan",
    bg: "bg-fan",
    border: "border-fan",
    soft: "bg-fan/10 text-fan border-fan/30",
  },
  band: {
    text: "text-band",
    bg: "bg-band",
    border: "border-band",
    soft: "bg-band/10 text-band border-band/30",
  },
} as const;
export function getRoleToneClass(
  tone: RoleTone,
  kind: keyof (typeof ROLE_ACCENT)[RoleTone],
): string {
  return ROLE_ACCENT[tone][kind];
}
export function roleToneSoft(tone: RoleTone): string {
  return cn("border", ROLE_ACCENT[tone].soft);
}

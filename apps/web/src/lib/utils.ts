import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge"; // Tailwind class merge utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
} // Re-export shared utilities
export * from "@ear-plug/shared/utils";

type ClassValue = string | number | boolean | undefined | null | { [key: string]: boolean } | ClassValue[];

/**
 * Utility function to conditionally join class names together.
 * Simplified version of clsx for React Native.
 */
export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === "string" || typeof input === "number") {
      classes.push(String(input));
    } else if (typeof input === "object") {
      if (Array.isArray(input)) {
        const result = cn(...input);
        if (result) classes.push(result);
      } else {
        for (const [key, value] of Object.entries(input)) {
          if (value) classes.push(key);
        }
      }
    }
  }

  return classes.join(" ");
}

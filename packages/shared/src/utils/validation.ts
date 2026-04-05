/**
 * Validates an email address format using a simple regex pattern.
 * Note: This is a basic check, not fully RFC 5322 compliant.
 *
 * @param email - Email address to validate
 * @returns True if the email format is valid
 *
 * @example
 * isValidEmail("user@example.com"); // true
 * isValidEmail("invalid-email");    // false
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates if a string is a properly formatted URL.
 *
 * @param url - URL string to validate
 * @returns True if the URL is valid
 *
 * @example
 * isValidUrl("https://example.com");  // true
 * isValidUrl("not-a-url");            // false
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalizes a personal name field by trimming whitespace and collapsing
 * internal spacing into single spaces.
 */
export function normalizePersonalNamePart(value?: string | null): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

/**
 * Returns true when both first and last names are present after normalization.
 */
export function hasRequiredPersonalName(
  firstName?: string | null,
  lastName?: string | null
): boolean {
  return (
    normalizePersonalNamePart(firstName).length > 0 &&
    normalizePersonalNamePart(lastName).length > 0
  );
}

/**
 * Composes a display name from normalized first and last name parts.
 */
export function composePersonalName(
  firstName?: string | null,
  lastName?: string | null
): string {
  const normalizedFirstName = normalizePersonalNamePart(firstName);
  const normalizedLastName = normalizePersonalNamePart(lastName);

  return [normalizedFirstName, normalizedLastName].filter(Boolean).join(" ");
}

/**
 * Splits an existing display name into first and last name fields.
 * Uses the first token as first name and preserves the remaining tokens as last name.
 */
export function splitPersonalName(
  fullName?: string | null
): { firstName: string; lastName: string } {
  const normalizedFullName = normalizePersonalNamePart(fullName);
  if (!normalizedFullName) {
    return { firstName: "", lastName: "" };
  }

  const [firstName, ...remainingParts] = normalizedFullName.split(" ");

  return {
    firstName,
    lastName: remainingParts.join(" "),
  };
}

/**
 * Returns true when a full display name can be split into both first and last names.
 */
export function hasRequiredFullPersonalName(fullName?: string | null): boolean {
  const { firstName, lastName } = splitPersonalName(fullName);
  return hasRequiredPersonalName(firstName, lastName);
}

/**
 * Returns a user-facing validation error for missing personal name fields.
 */
export function getPersonalNameValidationError(
  firstName?: string | null,
  lastName?: string | null
): string | null {
  if (normalizePersonalNamePart(firstName).length === 0) {
    return "First name is required.";
  }

  if (normalizePersonalNamePart(lastName).length === 0) {
    return "Last name is required.";
  }

  return null;
}

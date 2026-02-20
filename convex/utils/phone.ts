export type NormalizeInvitePhoneResult =
  | {
      ok: true;
      e164: string;
    }
  | {
      ok: false;
      message: string;
    };

const E164_REGEX = /^\+[1-9]\d{9,14}$/;

/**
 * Normalize invite phone input into E.164.
 *
 * Accepted:
 * - E.164 with leading "+"
 * - Common US 10-digit local format -> +1XXXXXXXXXX
 * - US 11-digit format starting with "1" -> +1XXXXXXXXXX
 */
export function normalizeInvitePhone(input: string): NormalizeInvitePhoneResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      ok: false,
      message: "Phone number is required",
    };
  }

  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "");
    const e164 = `+${digits}`;
    if (E164_REGEX.test(e164)) {
      return { ok: true, e164 };
    }

    return {
      ok: false,
      message: "Enter a valid phone number in international format",
    };
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) {
    return {
      ok: true,
      e164: `+1${digits}`,
    };
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return {
      ok: true,
      e164: `+${digits}`,
    };
  }

  return {
    ok: false,
    message: "Enter a valid US phone number or full international format",
  };
}

export function isE164Phone(value: string): boolean {
  return E164_REGEX.test(value);
}

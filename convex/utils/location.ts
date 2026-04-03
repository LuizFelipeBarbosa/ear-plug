const US_COUNTRY_SUFFIX_REGEX =
  /,\s*(?:u\.?\s*s\.?\s*a?\.?|united states(?: of america)?)$/i;

const US_STATE_ABBREVIATIONS: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC",
};

function normalizeUsStateSegment(segment: string) {
  const normalized = segment.trim().replace(/\./g, "");
  if (!normalized) {
    return null;
  }

  if (/^[A-Za-z]{2}$/.test(normalized)) {
    return normalized.toUpperCase();
  }

  return US_STATE_ABBREVIATIONS[normalized.toLocaleLowerCase()] ?? null;
}

export function normalizeUsLocation(location: string | undefined | null) {
  const normalized = location
    ?.trim()
    .replace(/\s+/g, " ")
    .replace(US_COUNTRY_SUFFIX_REGEX, "");

  if (!normalized) {
    return undefined;
  }

  const parts = normalized
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length < 2) {
    return normalized;
  }

  const locality = parts.slice(0, -1).join(", ");
  const normalizedState = normalizeUsStateSegment(parts[parts.length - 1]);

  if (!locality || !normalizedState) {
    return normalized;
  }

  return `${locality}, ${normalizedState}`;
}

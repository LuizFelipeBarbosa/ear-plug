export type PlacesLibraryErrorReason =
  | "browser_only"
  | "missing_api_key"
  | "script_error"
  | "timeout";

export type EnsurePlacesLibraryResult =
  | { ready: true }
  | {
      ready: false;
      reason: PlacesLibraryErrorReason;
      message: string;
    };

interface EnsurePlacesLibraryOptions {
  apiKey?: string;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 8000;
const PLACES_SCRIPT_DATA_ATTR = "data-ear-plug-google-places";
const GOOGLE_MAPS_API_KEY_ROUTE = "/api/google/maps-key";

let inFlightPromise: Promise<EnsurePlacesLibraryResult> | null = null;
let apiKeyPromise: Promise<string | null> | null = null;

function normalizeApiKey(apiKey: string | undefined): string | null {
  if (!apiKey) {
    return null;
  }

  const normalized = apiKey.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function loadGoogleMapsApiKey(): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }

  if (apiKeyPromise) {
    return apiKeyPromise;
  }

  apiKeyPromise = fetch(GOOGLE_MAPS_API_KEY_ROUTE, {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
    },
  })
    .then(async (response) => {
      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as { apiKey?: unknown };
      if (typeof payload.apiKey !== "string") {
        return null;
      }

      return normalizeApiKey(payload.apiKey);
    })
    .catch(() => null);

  const apiKey = await apiKeyPromise;
  if (!apiKey) {
    apiKeyPromise = null;
  }

  return apiKey;
}

function hasPlacesLibrary(): boolean {
  return typeof window !== "undefined" && Boolean(window.google?.maps?.places);
}

function getImportLibrary():
  | ((libraryName: string) => Promise<unknown>)
  | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.google?.maps?.importLibrary as
    | ((libraryName: string) => Promise<unknown>)
    | undefined;
}

function getOrCreatePlacesScript(apiKey: string): HTMLScriptElement {
  const selector = `script[${PLACES_SCRIPT_DATA_ATTR}="true"]`;
  const existingScript = document.querySelector(selector);
  if (existingScript instanceof HTMLScriptElement) {
    return existingScript;
  }

  const existingGoogleMapsScript = document.querySelector(
    'script[src*="maps.googleapis.com/maps/api/js"]',
  );
  if (existingGoogleMapsScript instanceof HTMLScriptElement) {
    return existingGoogleMapsScript;
  }

  const script = document.createElement("script");
  const params = new URLSearchParams({
    key: apiKey,
    libraries: "places",
    loading: "async",
  });
  script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
  script.async = true;
  script.defer = true;
  script.setAttribute(PLACES_SCRIPT_DATA_ATTR, "true");
  document.head.appendChild(script);

  return script;
}

function waitForPlacesOrTimeout(
  timeoutMs: number,
  script: HTMLScriptElement,
): Promise<"ready" | "error" | "timeout"> {
  if (hasPlacesLibrary()) {
    return Promise.resolve("ready");
  }

  return new Promise((resolve) => {
    const start = Date.now();

    const cleanup = (result: "ready" | "error" | "timeout") => {
      window.clearInterval(intervalId);
      script.removeEventListener("error", handleScriptError);
      resolve(result);
    };

    const handleScriptError = () => cleanup("error");

    script.addEventListener("error", handleScriptError, { once: true });

    const intervalId = window.setInterval(() => {
      if (hasPlacesLibrary()) {
        cleanup("ready");
        return;
      }

      if (Date.now() - start >= timeoutMs) {
        cleanup("timeout");
      }
    }, 100);
  });
}

export async function ensurePlacesLibrary(
  options: EnsurePlacesLibraryOptions = {},
): Promise<EnsurePlacesLibraryResult> {
  if (typeof window === "undefined") {
    return {
      ready: false,
      reason: "browser_only",
      message: "Google Maps can only load in a browser environment.",
    };
  }

  if (hasPlacesLibrary()) {
    return { ready: true };
  }

  if (inFlightPromise) {
    return inFlightPromise;
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  inFlightPromise = (async () => {
    const apiKey =
      normalizeApiKey(options.apiKey) ?? (await loadGoogleMapsApiKey());

    if (!apiKey) {
      return {
        ready: false,
        reason: "missing_api_key",
        message:
          "Missing Google Maps API key. You can enter this field manually.",
      } as const;
    }

    const importLibrary = getImportLibrary();
    if (importLibrary) {
      try {
        await Promise.race([
          importLibrary("places"),
          new Promise((_, reject) => {
            window.setTimeout(() => reject(new Error("timeout")), timeoutMs);
          }),
        ]);
      } catch {
        // Continue to script fallback below.
      }

      if (hasPlacesLibrary()) {
        return { ready: true } as const;
      }
    }

    const script = getOrCreatePlacesScript(apiKey);
    const scriptResult = await waitForPlacesOrTimeout(timeoutMs, script);

    if (scriptResult === "ready") {
      return { ready: true } as const;
    }

    if (scriptResult === "error") {
      return {
        ready: false,
        reason: "script_error",
        message:
          "Google Maps Places could not be loaded. You can enter this field manually.",
      } as const;
    }

    return {
      ready: false,
      reason: "timeout",
      message:
        "Google Maps Places took too long to load. You can enter this field manually.",
    } as const;
  })().finally(() => {
    inFlightPromise = null;
  });

  return inFlightPromise;
}

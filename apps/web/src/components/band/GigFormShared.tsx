"use client";

import { useEffect, useState, type ReactNode, type RefObject } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  Loader2,
  Lock,
  DollarSign,
  Eye,
  EyeOff,
  FileText,
  ImageIcon,
  MapPin,
  MessageSquareText,
  Music,
  Plus,
  Search,
  Trash2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { CityAutocomplete, type VenueLocationData } from "@/components/ui/CityAutocomplete";
import { IconBadge } from "@/components/ui/IconBadge";
import { cn } from "@/lib/utils";
import {
  GENRES,
  GENRE_COLORS,
  IMAGE_FILE_INPUT_ACCEPT,
} from "@ear-plug/shared/constants";
import type {
  EventAddressVisibility,
  EventPoll,
  EventStatus,
  Genre,
} from "@ear-plug/shared/types";

export const MAX_EVENT_GENRES = 3;
export const MIN_EVENT_POLL_OPTIONS = 2;
export const MAX_EVENT_POLL_OPTIONS = 6;
export const MAX_EVENT_POLL_QUESTIONS = 3;

const COORDINATE_NUMBER_PATTERN = "[-+]?\\d+(?:\\.\\d+)?";
const LATITUDE_MIN = -90;
const LATITUDE_MAX = 90;
const LONGITUDE_MIN = -180;
const LONGITUDE_MAX = 180;

interface Coordinates {
  lat: number;
  lng: number;
}

interface ManualVenueFormState {
  name: string;
  address: string;
  city: string;
  coordinateInput: string;
  latitude: string;
  longitude: string;
}

function isValidCoordinateRange(coordinates: Coordinates | null | undefined): boolean {
  return (
    coordinates !== null &&
    coordinates !== undefined &&
    Number.isFinite(coordinates.lat) &&
    coordinates.lat >= LATITUDE_MIN &&
    coordinates.lat <= LATITUDE_MAX &&
    Number.isFinite(coordinates.lng) &&
    coordinates.lng >= LONGITUDE_MIN &&
    coordinates.lng <= LONGITUDE_MAX
  );
}

function formatCoordinateInput(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "";
  }

  return Number(value.toFixed(6)).toString();
}

function parseCoordinatePair(latValue: string, lngValue: string): Coordinates | null {
  const lat = Number(latValue.trim());
  const lng = Number(lngValue.trim());
  const coordinates = { lat, lng };

  return isValidCoordinateRange(coordinates) ? coordinates : null;
}

function decodeCoordinateText(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseCoordinateText(value: string): Coordinates | null {
  const normalized = decodeCoordinateText(value.trim())
    .replace(/[，]/g, ",")
    .replace(/\+/g, " ");

  if (!normalized) {
    return null;
  }

  const latMatch = normalized.match(
    new RegExp(`\\b(?:lat|latitude)\\s*[:=]\\s*(${COORDINATE_NUMBER_PATTERN})`, "i"),
  );
  const lngMatch = normalized.match(
    new RegExp(
      `\\b(?:lng|lon|long|longitude)\\s*[:=]\\s*(${COORDINATE_NUMBER_PATTERN})`,
      "i",
    ),
  );

  if (latMatch?.[1] && lngMatch?.[1]) {
    return parseCoordinatePair(latMatch[1], lngMatch[1]);
  }

  const mapMatch = normalized.match(
    new RegExp(
      `(?:@|(?:^|[?&\\s])(?:q|ll)=)\\s*(${COORDINATE_NUMBER_PATTERN})\\s*,\\s*(${COORDINATE_NUMBER_PATTERN})`,
      "i",
    ),
  );

  if (mapMatch?.[1] && mapMatch?.[2]) {
    return parseCoordinatePair(mapMatch[1], mapMatch[2]);
  }

  const pairMatch = normalized.match(
    new RegExp(
      `(${COORDINATE_NUMBER_PATTERN})\\s*,\\s*(${COORDINATE_NUMBER_PATTERN})`,
      "i",
    ),
  );

  if (pairMatch?.[1] && pairMatch?.[2]) {
    return parseCoordinatePair(pairMatch[1], pairMatch[2]);
  }

  return null;
}

function createManualVenueFormState(
  venue: VenueLocationData | null,
): ManualVenueFormState {
  const latitude = formatCoordinateInput(venue?.coordinates?.lat);
  const longitude = formatCoordinateInput(venue?.coordinates?.lng);

  return {
    name: venue?.name ?? "",
    address: venue?.address ?? "",
    city: venue?.city ?? "",
    coordinateInput: latitude && longitude ? `${latitude}, ${longitude}` : "",
    latitude,
    longitude,
  };
}

export interface GigPollFormOption {
  id: string;
  label: string;
}

export interface GigPollFormQuestion {
  id: string;
  question: string;
  options: GigPollFormOption[];
}

function createGigPollOptionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `poll-option-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyGigPollOption(): GigPollFormOption {
  return {
    id: createGigPollOptionId(),
    label: "",
  };
}

function createGigPollQuestionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `poll-question-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyGigPollQuestion(): GigPollFormQuestion {
  return {
    id: createGigPollQuestionId(),
    question: "",
    options: [createEmptyGigPollOption(), createEmptyGigPollOption()],
  };
}

export type GigModalTab = "details" | "lineup" | "settings";

export type GigModalTone = "confirmed" | "tentative" | "neutral";

interface GigModalTabOption {
  id: GigModalTab;
  label: string;
  icon: LucideIcon;
}

export const GIG_MODAL_TABS: GigModalTabOption[] = [
  { id: "details", label: "Details", icon: FileText },
  { id: "lineup", label: "Lineup", icon: Music },
  { id: "settings", label: "Settings", icon: Eye },
];

const GIG_MODAL_TONE_STYLES: Record<
  GigModalTone,
  {
    icon: string;
    badge: string;
    eyebrow: string;
  }
> = {
  confirmed: {
    icon: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
    badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
    eyebrow: "text-emerald-600/80",
  },
  tentative: {
    icon: "border-amber-500/40 bg-amber-500/10 text-amber-500",
    badge: "border-amber-500/40 bg-amber-500/10 text-amber-600",
    eyebrow: "text-amber-600/80",
  },
  neutral: {
    icon: "border-band/30 bg-band/10 text-band",
    badge: "border-border bg-muted text-muted-foreground",
    eyebrow: "text-muted-foreground",
  },
};

export interface GigFormData {
  title: string;
  date: string;
  startTime: string;
  genres: Genre[];
  capacity: string;
  price: string;
  description: string;
  status: EventStatus;
  addressVisibility: EventAddressVisibility;
  pollEnabled: boolean;
  pollQuestions: GigPollFormQuestion[];
}

export function createGigFormData(initialStatus: EventStatus): GigFormData {
  return {
    title: "",
    date: "",
    startTime: "",
    genres: [],
    capacity: "",
    price: "",
    description: "",
    status: initialStatus,
    addressVisibility: "public",
    pollEnabled: false,
    pollQuestions: [createEmptyGigPollQuestion()],
  };
}

function pollQuestionErrorKey(questionId: string): string {
  return `pollQuestion-${questionId}`;
}

function pollOptionsErrorKey(questionId: string): string {
  return `pollOptions-${questionId}`;
}

function hasCompleteVenueSelection(
  venue: VenueLocationData | null,
): venue is VenueLocationData {
  return Boolean(
    venue &&
      venue.name.trim() &&
      venue.address.trim() &&
      venue.city.trim() &&
      isValidCoordinateRange(venue.coordinates),
  );
}

export function validateGigForm(
  formData: GigFormData,
  venue: VenueLocationData | null,
  targetStatus: EventStatus = formData.status,
): Record<string, string> {
  const nextErrors: Record<string, string> = {};
  const isTentative = targetStatus === "hold";

  if (!isTentative && !formData.title.trim()) {
    nextErrors.title = "Event title is required";
  }
  if (!isTentative && !formData.date) {
    nextErrors.date = "Date is required";
  }
  if (!isTentative && !venue) {
    nextErrors.venue = "Venue location is required";
  } else if (!isTentative && !hasCompleteVenueSelection(venue)) {
    nextErrors.venue =
      "Select a venue or add manual coordinates with name, address, city, latitude, and longitude.";
  }
  if (!isTentative && formData.genres.length === 0) {
    nextErrors.genres = "At least one genre is required";
  }
  if (formData.genres.length > MAX_EVENT_GENRES) {
    nextErrors.genres = `Select up to ${MAX_EVENT_GENRES} genres`;
  }

  if (formData.capacity.trim()) {
    const parsed = Number.parseInt(formData.capacity, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      nextErrors.capacity = "Capacity must be a positive number";
    }
  } else if (!isTentative) {
    nextErrors.capacity = "Capacity is required";
  }

  if (formData.price.trim()) {
    const parsed = Number.parseFloat(formData.price);
    if (!Number.isFinite(parsed) || parsed < 0) {
      nextErrors.price = "Price must be zero or greater";
    }
  }

  if (formData.pollEnabled) {
    if (
      formData.pollQuestions.length === 0 ||
      formData.pollQuestions.length > MAX_EVENT_POLL_QUESTIONS
    ) {
      nextErrors.pollQuestions = `Add between 1 and ${MAX_EVENT_POLL_QUESTIONS} poll questions`;
    }

    const seenQuestionIds = new Set<string>();
    for (const pollQuestion of formData.pollQuestions) {
      const normalizedQuestionId = pollQuestion.id.trim();
      if (!normalizedQuestionId || seenQuestionIds.has(normalizedQuestionId)) {
        nextErrors.pollQuestions = "Each poll question needs a stable unique id";
        break;
      }
      seenQuestionIds.add(normalizedQuestionId);

      const questionText = pollQuestion.question.trim();
      if (!questionText) {
        nextErrors[pollQuestionErrorKey(pollQuestion.id)] = "Poll question is required";
      } else if (questionText.length > 200) {
        nextErrors[pollQuestionErrorKey(pollQuestion.id)] =
          "Poll question must be 200 characters or fewer";
      }

      if (
        pollQuestion.options.length < MIN_EVENT_POLL_OPTIONS ||
        pollQuestion.options.length > MAX_EVENT_POLL_OPTIONS
      ) {
        nextErrors[pollOptionsErrorKey(pollQuestion.id)] =
          `Add between ${MIN_EVENT_POLL_OPTIONS} and ${MAX_EVENT_POLL_OPTIONS} poll options`;
      } else {
        const trimmedOptions = pollQuestion.options.map((option) => option.label.trim());
        const seen = new Set<string>();
        for (const option of trimmedOptions) {
          if (option.length === 0) {
            nextErrors[pollOptionsErrorKey(pollQuestion.id)] =
              "Poll options cannot be empty";
            break;
          }

          const normalized = option.toLowerCase();
          if (seen.has(normalized)) {
            nextErrors[pollOptionsErrorKey(pollQuestion.id)] =
              "Poll options must be unique";
            break;
          }
          seen.add(normalized);
        }
      }
    }
  }

  return nextErrors;
}

export function parseGigFormNumbers(formData: GigFormData): {
  capacity: number | undefined;
  price: number | undefined;
} {
  return {
    capacity: formData.capacity.trim()
      ? Number.parseInt(formData.capacity, 10)
      : undefined,
    price: formData.price.trim()
      ? Math.round(Number.parseFloat(formData.price) * 100)
      : undefined,
  };
}

export function buildEventPollFromForm(
  formData: Pick<GigFormData, "pollEnabled" | "pollQuestions">
): EventPoll | undefined {
  if (!formData.pollEnabled) {
    return undefined;
  }

  return {
    questions: formData.pollQuestions.map((question) => ({
      id: question.id,
      question: question.question.trim(),
      options: question.options.map((option) => ({
        id: option.id,
        label: option.label.trim(),
      })),
    })),
  };
}

interface GigModalTabsProps {
  activeTab: GigModalTab;
  onChange: (tab: GigModalTab) => void;
}

export function GigModalTabs({ activeTab, onChange }: GigModalTabsProps) {
  return (
    <div className="mt-4">
      <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
        {GIG_MODAL_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "group flex min-w-0 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-medium transition-all sm:px-4 sm:text-xs",
              activeTab === tab.id
                ? "bg-band text-white shadow-sm shadow-band/20"
                : "border border-border bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <IconBadge
              size="sm"
              className={cn(
                "transition-colors",
                activeTab === tab.id
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-border/70 bg-background/70 text-muted-foreground group-hover:border-foreground/10 group-hover:text-foreground",
              )}
            >
              <tab.icon />
            </IconBadge>
            <span className="truncate">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface GigModalHeaderProps {
  labelledBy: string;
  title: string;
  description: string;
  icon: LucideIcon;
  onClose: () => void;
  closeDisabled?: boolean;
  tone?: GigModalTone;
  badgeLabel?: string;
  eyebrow?: string;
}

export function GigModalHeader({
  labelledBy,
  title,
  description,
  icon: Icon,
  onClose,
  closeDisabled = false,
  tone = "neutral",
  badgeLabel,
  eyebrow,
}: GigModalHeaderProps) {
  const toneStyles = GIG_MODAL_TONE_STYLES[tone];

  return (
    <div className="border-b border-border bg-card/95 px-4 pb-4 pt-4 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 sm:h-12 sm:w-12",
              toneStyles.icon,
            )}
          >
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            {eyebrow ? (
              <p
                className={cn(
                  "mb-1 text-[11px] font-semibold  tracking-[0.18em]",
                  toneStyles.eyebrow,
                )}
              >
                {eyebrow}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id={labelledBy}
                className="text-base font-bold text-foreground sm:text-lg"
              >
                {title}
              </h2>
              {badgeLabel ? (
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                    toneStyles.badge,
                  )}
                >
                  {badgeLabel}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={closeDisabled}
          className="shrink-0 rounded-xl border border-border bg-muted p-2 text-muted-foreground transition-colors hover:border-band/30 hover:text-foreground disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export function GigModalErrorAlert({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

interface GigModalFooterProps {
  onCancel: () => void;
  cancelDisabled?: boolean;
  primaryLabel: string;
  primaryBusyLabel: string;
  primaryDisabled?: boolean;
  isBusy?: boolean;
}

export function GigModalFooter({
  onCancel,
  cancelDisabled = false,
  primaryLabel,
  primaryBusyLabel,
  primaryDisabled = false,
  isBusy = false,
}: GigModalFooterProps) {
  return (
    <div className="safe-area-inset-bottom border-t border-border bg-card/95 px-4 pb-6 pt-3 backdrop-blur-xl sm:pb-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={cancelDisabled}
          className="w-full rounded-xl bg-muted py-3 font-medium text-foreground transition-colors hover:bg-muted/80 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={primaryDisabled}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-band py-3 font-medium text-white transition-colors hover:bg-band/90 disabled:opacity-50"
        >
          {isBusy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {primaryBusyLabel}
            </>
          ) : (
            primaryLabel
          )}
        </button>
      </div>
    </div>
  );
}

interface GigSectionCardProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function GigSectionCard({
  title,
  description,
  children,
}: GigSectionCardProps) {
  return (
    <section className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

type GigLineupItemTone = "host" | "accepted" | "pending";

interface GigLineupItemProps {
  name: string;
  subtitle: string;
  tone?: GigLineupItemTone;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
}

export function GigLineupItem({
  name,
  subtitle,
  tone = "accepted",
  actionLabel,
  onAction,
  actionDisabled = false,
}: GigLineupItemProps) {
  const toneClasses =
    tone === "host"
      ? {
          card: "border-band/30 bg-band/10",
          iconWrap: "bg-band/20",
          icon: "text-band",
          subtitle: "text-band",
        }
      : tone === "pending"
        ? {
            card: "border-amber-500/20 bg-amber-500/5",
            iconWrap: "bg-amber-500/10",
            icon: "text-amber-500",
            subtitle: "text-amber-500",
          }
        : {
            card: "border-border bg-card",
            iconWrap: "bg-muted",
            icon: "text-muted-foreground",
            subtitle: "text-success",
          };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between",
        toneClasses.card,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            toneClasses.iconWrap,
          )}
        >
          <Music className={cn("h-5 w-5", toneClasses.icon)} />
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{name}</p>
          <p className={cn("text-xs", toneClasses.subtitle)}>{subtitle}</p>
        </div>
      </div>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          disabled={actionDisabled}
          className="w-full rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500 transition-colors hover:bg-red-500/20 disabled:opacity-50 sm:w-auto"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

interface GigBandSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function GigBandSearchInput({
  value,
  onChange,
  placeholder = "Search bands...",
}: GigBandSearchInputProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-muted px-4 py-3 pl-10 text-foreground placeholder:text-muted-foreground focus:border-band focus:outline-none"
      />
    </div>
  );
}

interface ManualCoordinateVenueFormProps {
  venue: VenueLocationData | null;
  onVenueChange: (venue: VenueLocationData) => void;
  clearError: (field: string) => void;
}

function ManualCoordinateVenueForm({
  venue,
  onVenueChange,
  clearError,
}: ManualCoordinateVenueFormProps) {
  const [formState, setFormState] = useState<ManualVenueFormState>(() =>
    createManualVenueFormState(venue),
  );
  const [manualErrors, setManualErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormState(createManualVenueFormState(venue));
    setManualErrors({});
  }, [venue]);

  const clearManualError = (field: string) => {
    if (!manualErrors[field]) {
      return;
    }

    setManualErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const updateManualField = (field: keyof ManualVenueFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    clearManualError(field);
  };

  const updateCoordinateInput = (value: string) => {
    const parsed = parseCoordinateText(value);
    const trimmed = value.trim();

    setFormState((prev) => {
      if (parsed) {
        return {
          ...prev,
          coordinateInput: value,
          latitude: formatCoordinateInput(parsed.lat),
          longitude: formatCoordinateInput(parsed.lng),
        };
      }

      // Only wipe lat/lng when the field is fully cleared — otherwise keep
      // whatever the user typed in those fields (or a prior successful paste)
      // so one bad keystroke in the combined input doesn't blow their work
      // away.
      if (trimmed === "") {
        return {
          ...prev,
          coordinateInput: value,
          latitude: "",
          longitude: "",
        };
      }

      return {
        ...prev,
        coordinateInput: value,
      };
    });

    if (parsed || trimmed === "") {
      clearManualError("coordinateInput");
    } else {
      setManualErrors((prev) => ({
        ...prev,
        coordinateInput:
          "Paste a Google Maps link or enter coordinates like 37.7749, -122.4194",
      }));
    }

    if (parsed) {
      clearManualError("latitude");
      clearManualError("longitude");
    }
  };

  const validateManualVenue = (): {
    venue: VenueLocationData | null;
    errors: Record<string, string>;
  } => {
    const errors: Record<string, string> = {};
    const name = formState.name.trim();
    const address = formState.address.trim();
    const city = formState.city.trim();
    const latitude = formState.latitude.trim();
    const longitude = formState.longitude.trim();

    if (!name) errors.name = "Venue name is required";
    if (!address) errors.address = "Address is required";
    if (!city) errors.city = "City is required";
    if (!latitude) {
      errors.latitude = "Latitude is required";
    }
    if (!longitude) {
      errors.longitude = "Longitude is required";
    }

    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);

    if (
      latitude &&
      (!Number.isFinite(parsedLatitude) ||
        parsedLatitude < LATITUDE_MIN ||
        parsedLatitude > LATITUDE_MAX)
    ) {
      errors.latitude = "Latitude must be between -90 and 90";
    }
    if (
      longitude &&
      (!Number.isFinite(parsedLongitude) ||
        parsedLongitude < LONGITUDE_MIN ||
        parsedLongitude > LONGITUDE_MAX)
    ) {
      errors.longitude = "Longitude must be between -180 and 180";
    }

    if (Object.keys(errors).length > 0) {
      return { venue: null, errors };
    }

    return {
      venue: {
        name,
        address,
        city,
        coordinates: {
          lat: parsedLatitude,
          lng: parsedLongitude,
        },
      },
      errors: {},
    };
  };

  const applyManualVenue = () => {
    const result = validateManualVenue();
    if (!result.venue) {
      setManualErrors(result.errors);
      return;
    }

    setManualErrors({});
    onVenueChange(result.venue);
    clearError("venue");
  };

  const manualInputClass = (field: string) =>
    cn(
      "w-full rounded-xl border bg-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none",
      manualErrors[field]
        ? "border-red-500 focus:border-red-500"
        : "border-border focus:border-band",
    );

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-band/20 bg-band/10 text-band">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Manual Coordinates
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Complete venue details before applying.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={applyManualVenue}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-band px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-band/90"
        >
          <Check className="h-4 w-4" />
          Apply Location
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Coordinates or Link
          </label>
          <input
            type="text"
            value={formState.coordinateInput}
            onChange={(event) => updateCoordinateInput(event.target.value)}
            placeholder="37.7749, -122.4194"
            className={manualInputClass("coordinateInput")}
          />
          {manualErrors.coordinateInput ? (
            <p className="mt-1 text-xs text-red-500">
              {manualErrors.coordinateInput}
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Venue Name
          </label>
          <input
            type="text"
            value={formState.name}
            onChange={(event) => updateManualField("name", event.target.value)}
            className={manualInputClass("name")}
          />
          {manualErrors.name ? (
            <p className="mt-1 text-xs text-red-500">{manualErrors.name}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            City
          </label>
          <input
            type="text"
            value={formState.city}
            onChange={(event) => updateManualField("city", event.target.value)}
            className={manualInputClass("city")}
          />
          {manualErrors.city ? (
            <p className="mt-1 text-xs text-red-500">{manualErrors.city}</p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Address
          </label>
          <input
            type="text"
            value={formState.address}
            onChange={(event) => updateManualField("address", event.target.value)}
            className={manualInputClass("address")}
          />
          {manualErrors.address ? (
            <p className="mt-1 text-xs text-red-500">{manualErrors.address}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Latitude
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={formState.latitude}
            onChange={(event) =>
              updateManualField("latitude", event.target.value)
            }
            className={manualInputClass("latitude")}
          />
          {manualErrors.latitude ? (
            <p className="mt-1 text-xs text-red-500">{manualErrors.latitude}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Longitude
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={formState.longitude}
            onChange={(event) =>
              updateManualField("longitude", event.target.value)
            }
            className={manualInputClass("longitude")}
          />
          {manualErrors.longitude ? (
            <p className="mt-1 text-xs text-red-500">{manualErrors.longitude}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface GigDetailsSectionProps {
  formData: GigFormData;
  errors: Record<string, string>;
  venue: VenueLocationData | null;
  coverImage: string | null;
  isDragging: boolean;
  setIsDragging: (isDragging: boolean) => void;
  fileInputRef: RefObject<HTMLInputElement>;
  onImageSelect: (file: File) => void;
  onRemoveImage: () => void;
  onUpdateField: (field: keyof GigFormData, value: string) => void;
  onVenueChange: (venue: VenueLocationData | null) => void;
  onGenresChange: (genres: Genre[]) => void;
  clearError: (field: string) => void;
}

export function GigDetailsSection({
  formData,
  errors,
  venue,
  coverImage,
  isDragging,
  setIsDragging,
  fileInputRef,
  onImageSelect,
  onRemoveImage,
  onUpdateField,
  onVenueChange,
  onGenresChange,
  clearError,
}: GigDetailsSectionProps) {
  const isTentative = formData.status === "hold";

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-2">
          Cover Image
        </label>
        {coverImage ? (
          <div className="relative aspect-video bg-muted border border-border rounded-xl overflow-hidden group">
            <Image
              src={coverImage}
              alt="Cover preview"
              fill
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-3">
              <div className="flex flex-wrap justify-end gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 bg-white text-black text-sm font-medium rounded-xl hover:bg-white/90"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={onRemoveImage}
                  className="px-3 py-2 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              const file = event.dataTransfer.files?.[0];
              if (file) {
                onImageSelect(file);
              }
            }}
            className={cn(
              "aspect-video border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors",
              isDragging
                ? "border-band bg-band/5"
                : "border-border hover:border-muted-foreground bg-muted",
            )}
          >
            <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Click or drag image here</p>
            <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, or WEBP up to 10MB</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_FILE_INPUT_ACCEPT}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              onImageSelect(file);
            }
          }}
          className="hidden"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-2">
          Event Title {!isTentative && <span className="text-band">*</span>}
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(event) => onUpdateField("title", event.target.value)}
          className={cn(
            "w-full px-4 py-3 bg-muted border rounded-xl text-foreground focus:outline-none transition-colors",
            errors.title ? "border-red-500" : "border-border focus:border-band",
          )}
        />
        {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <label className="block text-xs font-semibold text-muted-foreground mb-2">
            Date {!isTentative && <span className="text-band">*</span>}
          </label>
          <div className="relative min-w-0 overflow-hidden">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="date"
              value={formData.date}
              onChange={(event) => onUpdateField("date", event.target.value)}
              className={cn(
                "w-full min-w-0 max-w-full pl-10 pr-3 py-3 bg-muted border rounded-xl text-foreground focus:outline-none",
                errors.date ? "border-red-500" : "border-border focus:border-band",
              )}
            />
          </div>
        </div>
        <div className="min-w-0">
          <label className="block text-xs font-semibold text-muted-foreground mb-2">
            Start Time
          </label>
          <div className="relative min-w-0 overflow-hidden">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="time"
              value={formData.startTime}
              onChange={(event) => onUpdateField("startTime", event.target.value)}
              className="w-full min-w-0 max-w-full pl-10 pr-3 py-3 bg-muted border border-border rounded-xl text-foreground focus:outline-none focus:border-band"
            />
          </div>
        </div>
      </div>

      <CityAutocomplete
        mode="venue"
        value={venue}
        onChange={(value) => {
          const selectedVenue = value as VenueLocationData | null;
          onVenueChange(selectedVenue);
          if (selectedVenue && errors.venue) {
            clearError("venue");
          }
        }}
        label="Venue Location"
        placeholder="Search for a venue..."
        required={!isTentative}
        error={errors.venue}
      />

      <ManualCoordinateVenueForm
        venue={venue}
        onVenueChange={(manualVenue) => {
          onVenueChange(manualVenue);
          if (errors.venue) {
            clearError("venue");
          }
        }}
        clearError={clearError}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-2">
            Capacity {!isTentative && <span className="text-band">*</span>}
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="number"
              min="1"
              value={formData.capacity}
              onChange={(event) => onUpdateField("capacity", event.target.value)}
              className={cn(
                "w-full pl-10 pr-3 py-3 bg-muted border rounded-xl text-foreground focus:outline-none",
                errors.capacity ? "border-red-500" : "border-border focus:border-band",
              )}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-2">
            Price ($)
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(event) => onUpdateField("price", event.target.value)}
              placeholder="0.00"
              className="w-full pl-10 pr-3 py-3 bg-muted border border-border rounded-xl text-foreground focus:outline-none focus:border-band"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(event) => onUpdateField("description", event.target.value)}
          placeholder="Tell fans about the show..."
          rows={4}
          className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-band resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-2">
          Genres ({formData.genres.length}/{MAX_EVENT_GENRES})
          {!isTentative && <span className="text-band">*</span>}
        </label>
        <div
          className={cn(
            "grid grid-cols-2 gap-2 p-3 bg-muted border rounded-xl",
            errors.genres ? "border-red-500" : "border-border",
          )}
        >
          {GENRES.map((genreOption) => {
            const isSelected = formData.genres.includes(genreOption.value);
            const isDisabled =
              !isSelected && formData.genres.length >= MAX_EVENT_GENRES;
            const genreColor = GENRE_COLORS[genreOption.value];

            return (
              <button
                key={genreOption.value}
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  const nextGenres = isSelected
                    ? formData.genres.filter((genre) => genre !== genreOption.value)
                    : formData.genres.length < MAX_EVENT_GENRES
                      ? [...formData.genres, genreOption.value]
                      : formData.genres;
                  onGenresChange(nextGenres);
                  if (errors.genres) {
                    clearError("genres");
                  }
                }}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-lg transition-all",
                  isSelected
                    ? "text-white"
                    : isDisabled
                      ? "bg-card text-muted-foreground cursor-not-allowed"
                      : "hover:brightness-110",
                )}
                style={
                  isSelected
                    ? { backgroundColor: genreColor }
                    : isDisabled
                      ? undefined
                      : {
                          backgroundColor: `${genreColor}20`,
                          color: genreColor,
                        }
                }
              >
                {genreOption.label}
              </button>
            );
          })}
        </div>
        {errors.genres && (
          <p className="text-xs text-red-500 mt-1">{errors.genres}</p>
        )}
      </div>
    </motion.div>
  );
}

interface GigSettingsSectionProps {
  formData: Pick<
    GigFormData,
    | "status"
    | "addressVisibility"
    | "pollEnabled"
    | "pollQuestions"
  >;
  errors?: Record<string, string>;
  onStatusChange: (status: EventStatus) => void;
  onAddressVisibilityChange: (visibility: EventAddressVisibility) => void;
  onPollEnabledChange: (enabled: boolean) => void;
  onPollQuestionChange: (questionId: string, value: string) => void;
  onPollOptionChange: (questionId: string, optionId: string, value: string) => void;
  onAddPollQuestion: () => void;
  onRemovePollQuestion: (questionId: string) => void;
  onAddPollOption: (questionId: string) => void;
  onRemovePollOption: (questionId: string, optionId: string) => void;
  clearError?: (field: string) => void;
  pollLocked?: boolean;
  pollResponseCount?: number;
  dangerSlot?: ReactNode;
}

export function GigSettingsSection({
  formData,
  errors = {},
  onStatusChange,
  onAddressVisibilityChange,
  onPollEnabledChange,
  onPollQuestionChange,
  onAddPollQuestion,
  onRemovePollQuestion,
  onPollOptionChange,
  onAddPollOption,
  onRemovePollOption,
  clearError,
  pollLocked = false,
  pollResponseCount = 0,
  dangerSlot,
}: GigSettingsSectionProps) {
  const clearQuestionErrors = (questionId: string) => {
    clearError?.("pollQuestions");
    clearError?.(pollQuestionErrorKey(questionId));
    clearError?.(pollOptionsErrorKey(questionId));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-2">
          Event Status
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onStatusChange("confirmed")}
            className={cn(
              "flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl border-2 transition-all",
              formData.status === "confirmed"
                ? "bg-success text-white border-success"
                : "bg-card border-border text-muted-foreground hover:border-success/50",
            )}
          >
            <Check className="w-4 h-4" />
            Confirmed
          </button>
          <button
            type="button"
            onClick={() => onStatusChange("hold")}
            className={cn(
              "flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl border-2 transition-all",
              formData.status === "hold"
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-card border-border text-muted-foreground hover:border-amber-500/50",
            )}
          >
            <AlertCircle className="w-4 h-4" />
            Tentative
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-2">
          Address Visibility
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onAddressVisibilityChange("public")}
            className={cn(
              "px-4 py-3 text-sm font-medium rounded-xl border-2 transition-all flex items-center justify-center gap-2",
              formData.addressVisibility === "public"
                ? "bg-band text-white border-band"
                : "bg-card border-border text-muted-foreground hover:border-band/50",
            )}
          >
            <Eye className="w-4 h-4" />
            Public
          </button>
          <button
            type="button"
            onClick={() => onAddressVisibilityChange("rsvp_only")}
            className={cn(
              "px-4 py-3 text-sm font-medium rounded-xl border-2 transition-all flex items-center justify-center gap-2",
              formData.addressVisibility === "rsvp_only"
                ? "bg-band text-white border-band"
                : "bg-card border-border text-muted-foreground hover:border-band/50",
            )}
          >
            <EyeOff className="w-4 h-4" />
            RSVP Only
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          RSVP-only hides the street address until fans RSVP
        </p>
      </div>

      <GigSectionCard
        title="RSVP Poll"
        description="Ask up to three optional questions after fans RSVP. Fans answer them together and can come back later from the gig page."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                formData.pollEnabled
                  ? "border-band/30 bg-band/10 text-band"
                  : "border-border bg-muted text-muted-foreground",
              )}
            >
              <MessageSquareText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {formData.pollEnabled ? "Poll enabled" : "No RSVP poll"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {pollLocked
                  ? `Locked after ${pollResponseCount} response${pollResponseCount === 1 ? "" : "s"}.`
                  : "Up to three single-choice questions, answered in one go."}
              </p>
            </div>
          </div>

          {pollLocked ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Locked
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                onPollEnabledChange(!formData.pollEnabled);
                clearError?.("pollQuestions");
                formData.pollQuestions.forEach((question) => {
                  clearError?.(pollQuestionErrorKey(question.id));
                  clearError?.(pollOptionsErrorKey(question.id));
                });
              }}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                formData.pollEnabled
                  ? "border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20"
                  : "bg-band text-white hover:bg-band/90",
              )}
            >
              {formData.pollEnabled ? "Remove Poll" : "Enable Poll"}
            </button>
          )}
        </div>

        {formData.pollEnabled ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">
                  Questions ({formData.pollQuestions.length}/{MAX_EVENT_POLL_QUESTIONS})
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Fans will answer every question before saving.
                </p>
              </div>
              {!pollLocked ? (
                <button
                  type="button"
                  onClick={onAddPollQuestion}
                  disabled={formData.pollQuestions.length >= MAX_EVENT_POLL_QUESTIONS}
                  className="inline-flex items-center gap-1 rounded-xl border border-band/20 bg-band/10 px-3 py-2 text-xs font-medium text-band transition-colors hover:bg-band/15 disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add question
                </button>
              ) : null}
            </div>

            {errors.pollQuestions ? (
              <p className="text-xs text-red-500">{errors.pollQuestions}</p>
            ) : null}

            <div className="space-y-4">
              {formData.pollQuestions.map((pollQuestion, questionIndex) => {
                const questionError = errors[pollQuestionErrorKey(pollQuestion.id)];
                const optionError = errors[pollOptionsErrorKey(pollQuestion.id)];

                return (
                  <div
                    key={pollQuestion.id}
                    className="rounded-2xl border border-border bg-muted/20 p-4"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">
                          Question {questionIndex + 1}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Single-choice answers only.
                        </p>
                      </div>
                      {!pollLocked &&
                      formData.pollQuestions.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => {
                            onRemovePollQuestion(pollQuestion.id);
                            clearQuestionErrors(pollQuestion.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove question
                        </button>
                      ) : null}
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold text-muted-foreground">
                        Poll Question
                      </label>
                      <textarea
                        value={pollQuestion.question}
                        onChange={(event) => {
                          onPollQuestionChange(pollQuestion.id, event.target.value);
                          clearError?.(pollQuestionErrorKey(pollQuestion.id));
                        }}
                        disabled={pollLocked}
                        rows={3}
                        placeholder="What do you want fans to answer after they RSVP?"
                        className={cn(
                          "w-full resize-none rounded-xl border bg-muted px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none",
                          questionError
                            ? "border-red-500"
                            : "border-border focus:border-band",
                          pollLocked && "cursor-not-allowed opacity-70",
                        )}
                      />
                      {questionError ? (
                        <p className="mt-1 text-xs text-red-500">{questionError}</p>
                      ) : null}
                    </div>

                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label className="block text-xs font-semibold text-muted-foreground">
                          Answer Options ({pollQuestion.options.length}/{MAX_EVENT_POLL_OPTIONS})
                        </label>
                        {!pollLocked ? (
                          <button
                            type="button"
                            onClick={() => onAddPollOption(pollQuestion.id)}
                            disabled={pollQuestion.options.length >= MAX_EVENT_POLL_OPTIONS}
                            className="inline-flex items-center gap-1 text-xs font-medium text-band transition-colors hover:text-band/80 disabled:cursor-not-allowed disabled:text-muted-foreground"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add option
                          </button>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        {pollQuestion.options.map((option, optionIndex) => (
                          <div key={option.id} className="flex items-center gap-2">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-xs font-semibold text-muted-foreground">
                              {optionIndex + 1}
                            </div>
                            <input
                              type="text"
                              value={option.label}
                              onChange={(event) => {
                                onPollOptionChange(
                                  pollQuestion.id,
                                  option.id,
                                  event.target.value,
                                );
                                clearError?.(pollOptionsErrorKey(pollQuestion.id));
                              }}
                              disabled={pollLocked}
                              placeholder={`Option ${optionIndex + 1}`}
                              className={cn(
                                "min-w-0 flex-1 rounded-xl border bg-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none",
                                optionError
                                  ? "border-red-500"
                                  : "border-border focus:border-band",
                                pollLocked && "cursor-not-allowed opacity-70",
                              )}
                            />
                            {!pollLocked &&
                            pollQuestion.options.length > MIN_EVENT_POLL_OPTIONS ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onRemovePollOption(pollQuestion.id, option.id);
                                  clearError?.(pollOptionsErrorKey(pollQuestion.id));
                                }}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 transition-colors hover:bg-red-500/20"
                                aria-label={`Remove option ${optionIndex + 1} from question ${questionIndex + 1}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>

                      {optionError ? (
                        <p className="mt-1 text-xs text-red-500">{optionError}</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Fans will RSVP without a follow-up question.
          </div>
        )}
      </GigSectionCard>

      {dangerSlot}
    </motion.div>
  );
}

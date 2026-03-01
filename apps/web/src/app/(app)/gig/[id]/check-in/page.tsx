"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  QrCode,
  Trash2,
  UserPlus,
  XCircle,
} from "lucide-react";
import { api } from "../../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../../convex/_generated/dataModel";
import type {
  EventCheckinAssignableUser,
  EventTicketScanResult,
} from "@ear-plug/shared/types";
import { useEvent, useEventCheckinAccess, useEventCheckinStaff } from "@/hooks/useEvents";
import { useProfileContext } from "@/hooks/useProfileContext";
import { AvatarImage } from "@/components/ui/OptimizedImage";
import { cn } from "@/lib/utils";

interface CheckInPageProps {
  params: { id: string };
}

function formatResultMessage(result: EventTicketScanResult): string {
  switch (result.status) {
    case "checked_in":
      return `Checked in ${result.attendeeName ?? "guest"}.`;
    case "already_used":
      return `${result.attendeeName ?? "Ticket"} was already checked in.`;
    case "revoked":
      return `${result.attendeeName ?? "Ticket"} is revoked.`;
    default:
      return "Invalid ticket.";
  }
}

function formatTimestamp(value?: number): string {
  if (!value) return "";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function EventCheckinPage({ params }: CheckInPageProps) {
  const eventId = params.id as Id<"events">;
  const { event } = useEvent(eventId);
  const { bandId, mode } = useProfileContext();
  const { canScan, canManageStaff, managerBandIds, isLoading: accessLoading } =
    useEventCheckinAccess(eventId);

  const hasManagerBandContext =
    !!bandId && managerBandIds.includes(bandId as Id<"bands">);
  const canManageInActiveBand = canManageStaff && hasManagerBandContext;

  const {
    staff,
    isLoading: staffLoading,
    searchAssignableUsers,
    assignByUserId,
    removeStaff,
  } = useEventCheckinStaff(eventId, canManageInActiveBand ? (bandId as Id<"bands">) : undefined);

  const scanMutation = useMutation(api.events.scanEventTicket);

  const [scannerError, setScannerError] = useState<string | null>(null);
  const [manualQrValue, setManualQrValue] = useState("");
  const [lastResult, setLastResult] = useState<EventTicketScanResult | null>(null);
  const [processingScan, setProcessingScan] = useState(false);

  const [staffQuery, setStaffQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<EventCheckinAssignableUser | null>(null);
  const [suggestions, setSuggestions] = useState<EventCheckinAssignableUser[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffMessage, setStaffMessage] = useState<string | null>(null);
  const [assignPending, setAssignPending] = useState(false);
  const [removingStaffUserId, setRemovingStaffUserId] = useState<string | null>(null);

  const scannerRef = useRef<any | null>(null);
  const handlingScanRef = useRef(false);
  const autocompleteRef = useRef<HTMLDivElement | null>(null);

  const submitScan = useCallback(
    async (qrValue: string) => {
      if (!qrValue.trim()) return;
      handlingScanRef.current = true;
      setProcessingScan(true);
      setScannerError(null);

      try {
        const result = (await scanMutation({
          eventId,
          qrValue,
        })) as EventTicketScanResult;
        setLastResult(result);
      } catch (scanError) {
        setScannerError(
          scanError instanceof Error ? scanError.message : "Failed to scan ticket."
        );
      } finally {
        window.setTimeout(() => {
          handlingScanRef.current = false;
          setProcessingScan(false);
        }, 500);
      }
    },
    [eventId, scanMutation]
  );

  useEffect(() => {
    if (!canScan) return;

    let cancelled = false;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const scanner = new Html5Qrcode("ticket-checkin-qr-region");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 240, height: 240 },
          },
          async (decodedText: string) => {
            if (handlingScanRef.current) return;
            await submitScan(decodedText);
          },
          () => {
            // Ignore frame-level decode misses.
          }
        );
      } catch (error) {
        if (!cancelled) {
          setScannerError(
            error instanceof Error
              ? error.message
              : "Unable to access camera for scanning."
          );
        }
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;

      if (scanner) {
        void scanner
          .stop()
          .catch(() => {
            // Ignore cleanup failures.
          })
          .then(() => scanner.clear().catch(() => undefined));
      }
    };
  }, [canScan, submitScan]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!autocompleteRef.current) return;
      if (!autocompleteRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!canManageInActiveBand) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearchingUsers(false);
      return;
    }

    const normalizedQuery = staffQuery.trim();
    if (normalizedQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearchingUsers(false);
      return;
    }

    // Keep the picker collapsed once a concrete suggestion has been selected.
    if (
      selectedUser &&
      normalizedQuery.toLowerCase() === selectedUser.name.trim().toLowerCase()
    ) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearchingUsers(false);
      return;
    }

    let cancelled = false;
    setIsSearchingUsers(true);

    const timeoutId = window.setTimeout(() => {
      void searchAssignableUsers(normalizedQuery, 8)
        .then((users) => {
          if (cancelled) return;
          setSuggestions(users);
          setShowSuggestions(true);
        })
        .catch((error) => {
          if (cancelled) return;
          setStaffError(
            error instanceof Error ? error.message : "Failed to search users."
          );
          setSuggestions([]);
          setShowSuggestions(true);
        })
        .finally(() => {
          if (!cancelled) {
            setIsSearchingUsers(false);
          }
        });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [canManageInActiveBand, searchAssignableUsers, selectedUser, staffQuery]);

  const resultTone = useMemo(() => {
    if (!lastResult) return null;

    if (lastResult.status === "checked_in") {
      return "border-lime/40 bg-lime/10 text-lime";
    }

    if (lastResult.status === "already_used") {
      return "border-yellow-500/40 bg-yellow-500/10 text-yellow-200";
    }

    if (lastResult.status === "revoked") {
      return "border-red-500/40 bg-red-500/10 text-red-300";
    }

    return "border-zinc-700 bg-zinc-800 text-zinc-300";
  }, [lastResult]);

  const handleAssignStaff = async () => {
    if (!canManageInActiveBand || !selectedUser) return;

    setAssignPending(true);
    setStaffError(null);
    setStaffMessage(null);
    try {
      const result = await assignByUserId(selectedUser.userId as Id<"users">);
      setStaffMessage(
        result.action === "assigned"
          ? "Door staff assigned."
          : result.action === "reassigned"
            ? "Door staff reactivated."
            : "User already has access."
      );
      setSelectedUser(null);
      setStaffQuery("");
      setSuggestions([]);
      setShowSuggestions(false);
    } catch (error) {
      setStaffError(error instanceof Error ? error.message : "Failed to assign staff.");
    } finally {
      setAssignPending(false);
    }
  };

  const handleSelectSuggestion = (user: EventCheckinAssignableUser) => {
    setSelectedUser(user);
    setStaffQuery(user.name);
    setSuggestions([]);
    setShowSuggestions(false);
    setStaffError(null);
    setStaffMessage(null);
  };

  const handleRemoveStaff = async (staffUserId: string) => {
    if (!canManageInActiveBand) return;

    setRemovingStaffUserId(staffUserId);
    setStaffError(null);
    setStaffMessage(null);
    try {
      await removeStaff(staffUserId as Id<"users">);
      setStaffMessage("Door staff access revoked.");
    } catch (error) {
      setStaffError(error instanceof Error ? error.message : "Failed to revoke staff.");
    } finally {
      setRemovingStaffUserId(null);
    }
  };

  if (accessLoading) {
    return <div className="min-h-screen bg-night p-6 animate-shimmer" />;
  }

  if (!canScan) {
    return (
      <div className="min-h-screen bg-night p-6">
        <div className="max-w-3xl mx-auto border-2 border-zinc-800 bg-night-tertiary p-6">
          <h1 className="text-xl font-bold uppercase tracking-wide text-white mb-3">
            Check-in Access Required
          </h1>
          <p className="text-sm text-zinc-400 mb-6">
            Only event managers or assigned door staff can scan tickets.
          </p>
          <Link
            href={`/gig/${eventId}`}
            className="inline-flex items-center gap-2 px-3 py-2 border border-zinc-700 text-zinc-300 text-xs font-bold uppercase tracking-wider hover:border-zinc-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Event
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-night p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <Link
          href={`/gig/${eventId}`}
          className="inline-flex items-center gap-2 px-3 py-2 border border-zinc-700 text-zinc-300 text-xs font-bold uppercase tracking-wider hover:border-zinc-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Event
        </Link>

        <h1 className="mt-5 text-2xl font-bold uppercase tracking-tight text-white">
          Ticket Check-in
        </h1>
        <p className="text-sm text-zinc-400 mt-1 mb-6">
          {event?.title ?? "Event"} • Scan attendee QR codes at the door.
        </p>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="border-2 border-zinc-800 bg-night-tertiary p-4">
            <div className="flex items-center gap-2 mb-3">
              <QrCode className="w-4 h-4 text-lime" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
                Scanner
              </h2>
            </div>

            <div
              id="ticket-checkin-qr-region"
              className="min-h-[320px] border border-zinc-700 bg-black/30"
            />

            {processingScan && (
              <p className="mt-3 text-xs uppercase tracking-wider text-zinc-400">
                Processing scan...
              </p>
            )}

            {scannerError && (
              <p className="mt-3 text-xs uppercase tracking-wider text-red-300">{scannerError}</p>
            )}

            <div className="mt-5 border-t border-zinc-800 pt-4">
              <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">
                Manual QR fallback
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={manualQrValue}
                  onChange={(event) => setManualQrValue(event.target.value)}
                  placeholder="Paste QR payload (e.g. EPT1:token...)"
                  className="flex-1 bg-night-secondary border border-zinc-700 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime/40"
                />
                <button
                  type="button"
                  onClick={() => {
                    void submitScan(manualQrValue);
                    setManualQrValue("");
                  }}
                  disabled={!manualQrValue.trim() || processingScan}
                  className="px-3 py-2 border border-lime/40 text-lime text-xs font-bold uppercase tracking-wider hover:bg-lime hover:text-night transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Validate
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="border-2 border-zinc-800 bg-night-tertiary p-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 mb-3">
                Last Scan Result
              </h2>

              {lastResult ? (
                <div className={cn("border p-3", resultTone)}>
                  <div className="flex items-center gap-2 mb-2">
                    {lastResult.status === "checked_in" ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    <p className="text-xs font-bold uppercase tracking-wider">
                      {lastResult.status.replace("_", " ")}
                    </p>
                  </div>
                  <p className="text-sm">{formatResultMessage(lastResult)}</p>
                  {lastResult.ticketCode && (
                    <p className="text-[11px] uppercase tracking-wider mt-2">
                      Ticket {lastResult.ticketCode}
                    </p>
                  )}
                  {lastResult.usedAt && (
                    <p className="text-[11px] uppercase tracking-wider mt-1">
                      Checked in {formatTimestamp(lastResult.usedAt)}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No ticket scanned yet.</p>
              )}
            </div>

            <div className="border-2 border-zinc-800 bg-night-tertiary p-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 mb-3">
                Door Staff
              </h2>

              {canManageStaff ? (
                <>
                  {canManageInActiveBand ? (
                    <div className="space-y-3 mb-4">
                      <div
                        ref={autocompleteRef}
                        className="relative flex flex-col sm:flex-row gap-2"
                      >
                        <div className="flex-1 relative">
                          <input
                            value={staffQuery}
                            onChange={(event) => {
                              setStaffQuery(event.target.value);
                              setShowSuggestions(true);
                              if (selectedUser) {
                                setSelectedUser(null);
                              }
                              setStaffError(null);
                              setStaffMessage(null);
                            }}
                            onFocus={() => {
                              if (staffQuery.trim().length >= 2) {
                                setShowSuggestions(true);
                              }
                            }}
                            placeholder="Search users by name..."
                            className="w-full bg-night-secondary border border-zinc-700 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime/40"
                          />

                          {showSuggestions && staffQuery.trim().length >= 2 && (
                            <div className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto border border-zinc-700 bg-night-secondary shadow-xl">
                              {isSearchingUsers ? (
                                <p className="px-3 py-2 text-xs uppercase tracking-wider text-zinc-500">
                                  Searching...
                                </p>
                              ) : suggestions.length > 0 ? (
                                suggestions.map((user) => (
                                  <button
                                    key={user.userId}
                                    type="button"
                                    onClick={() => handleSelectSuggestion(user)}
                                    className="w-full px-3 py-2 text-left hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-b-0"
                                  >
                                    <span className="flex items-center gap-3">
                                      <AvatarImage
                                        src={user.avatar}
                                        alt={user.name}
                                        fallbackText={user.name}
                                        size={32}
                                        className="border border-zinc-700"
                                      />
                                      <span className="min-w-0">
                                        <span className="block text-sm font-semibold text-white truncate">
                                          {user.name}
                                        </span>
                                        <span className="block text-xs text-zinc-500 truncate">
                                          {user.email}
                                        </span>
                                      </span>
                                      {user.alreadyAssigned && (
                                        <span className="ml-auto px-2 py-0.5 border border-zinc-600 text-[10px] uppercase tracking-wider text-zinc-300">
                                          Assigned
                                        </span>
                                      )}
                                    </span>
                                  </button>
                                ))
                              ) : (
                                <p className="px-3 py-2 text-xs uppercase tracking-wider text-zinc-500">
                                  No users found
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleAssignStaff()}
                          disabled={!selectedUser || assignPending}
                          className="px-3 py-2 border border-lime/40 text-lime text-xs font-bold uppercase tracking-wider hover:bg-lime hover:text-night transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          {assignPending ? "Assigning..." : "Assign"}
                        </button>
                      </div>

                      {selectedUser && (
                        <p className="text-xs uppercase tracking-wider text-zinc-400">
                          Selected: {selectedUser.name} ({selectedUser.email})
                        </p>
                      )}

                      {staffMessage && (
                        <p className="text-xs uppercase tracking-wider text-lime">{staffMessage}</p>
                      )}
                      {staffError && (
                        <p className="text-xs uppercase tracking-wider text-red-300">{staffError}</p>
                      )}
                    </div>
                  ) : (
                    <div className="mb-4 border border-violet/40 bg-violet/10 p-3 text-xs uppercase tracking-wider text-violet">
                      Switch to a participating manager band workspace to edit door staff.
                    </div>
                  )}

                  {staffLoading ? (
                    <div className="h-24 bg-night-secondary animate-shimmer" />
                  ) : staff.length > 0 ? (
                    <div className="space-y-2">
                      {staff.map((member) => (
                        <div
                          key={member.userId}
                          className="flex items-center justify-between gap-3 border border-zinc-800 bg-night-secondary p-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <AvatarImage
                              src={member.avatar}
                              alt={member.name}
                              fallbackText={member.name}
                              size={34}
                              className="border border-zinc-700"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{member.name}</p>
                              <p className="text-xs text-zinc-500 truncate">{member.email}</p>
                            </div>
                          </div>
                          {canManageInActiveBand && (
                            <button
                              type="button"
                              onClick={() => void handleRemoveStaff(member.userId)}
                              disabled={removingStaffUserId === member.userId}
                              className="px-2.5 py-1.5 border border-red-500/40 text-red-300 text-[10px] font-bold uppercase tracking-wider hover:bg-red-500/10 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Revoke
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">No door staff assigned yet.</p>
                  )}
                </>
              ) : (
                <div className="border border-zinc-700 bg-night-secondary p-3 text-xs uppercase tracking-wider text-zinc-500 inline-flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Staff management is limited to event managers.
                </div>
              )}

              {mode !== "band" && canManageStaff && (
                <p className="mt-3 text-[11px] uppercase tracking-wider text-zinc-500">
                  Tip: switch to band workspace to manage assignments.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

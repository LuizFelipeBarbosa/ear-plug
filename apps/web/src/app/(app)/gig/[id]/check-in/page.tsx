"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation } from "convex/react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  QrCode,
  Trash2,
  UserPlus,
  XCircle,
  ScanLine,
  Users,
  Shield,
  Search,
  X,
  Crown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../../convex/_generated/dataModel";
import type {
  EventCheckinAssignableUser,
  EventTicketScanResult,
} from "@ear-plug/shared/types";
import {
  useEvent,
  useEventCheckinAccess,
  useEventCheckinStaff,
} from "@/hooks/useEvents";
import { useProfileContext } from "@/hooks/useProfileContext";
import { AvatarImage } from "@/components/ui/OptimizedImage";
import { cn } from "@/lib/utils";

interface TicketScannerController {
  stop(): Promise<void>;
  clear(): void;
}

async function disposeTicketScanner(
  scanner: TicketScannerController | null
): Promise<void> {
  if (!scanner) {
    return;
  }

  try {
    await scanner.stop();
  } catch {
    // The scanner can be in a transitional or already-stopped state during route exit.
  }

  try {
    scanner.clear();
  } catch {
    // Clear can also throw if the underlying element was already torn down.
  }
}

function formatResultMessage(result: EventTicketScanResult): string {
  switch (result.status) {
    case "checked_in":
      return `Welcome, ${result.attendeeName ?? "guest"}! Successfully checked in.`;
    case "already_used":
      return `${result.attendeeName ?? "This ticket"} was already checked in.`;
    case "revoked":
      return `This ticket has been revoked.`;
    default:
      return "Invalid ticket code.";
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

export default function EventCheckinPage() {
  const params = useParams<{ id: string }>();
  const eventId = typeof params?.id === "string"
    ? (params.id as Id<"events">)
    : undefined;
  const eventHref = eventId ? `/gig/${eventId}` : "/home";
  const { event } = useEvent(eventId);
  const { bandId, mode } = useProfileContext();
  const {
    canScan,
    canManageStaff,
    managerBandIds,
    isLoading: accessLoading,
  } = useEventCheckinAccess(eventId);

  const hasManagerBandContext =
    !!bandId && managerBandIds.includes(bandId as Id<"bands">);
  const canManageInActiveBand = canManageStaff && hasManagerBandContext;

  const {
    staff,
    isLoading: staffLoading,
    searchAssignableUsers,
    assignByUserId,
    removeStaff,
  } = useEventCheckinStaff(
    eventId,
    canManageInActiveBand ? (bandId as Id<"bands">) : undefined
  );

  const scanMutation = useMutation(api.eventTickets.scanEventTicket);

  const [scannerError, setScannerError] = useState<string | null>(null);
  const [manualQrValue, setManualQrValue] = useState("");
  const [lastResult, setLastResult] = useState<EventTicketScanResult | null>(null);
  const [processingScan, setProcessingScan] = useState(false);

  const [staffQuery, setStaffQuery] = useState("");
  const [selectedUser, setSelectedUser] =
    useState<EventCheckinAssignableUser | null>(null);
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
      if (!eventId) {
        setScannerError("Invalid event URL.");
        return;
      }
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
          scanError instanceof Error
            ? scanError.message
            : "Failed to scan ticket"
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
            qrbox: { width: 250, height: 250 },
          },
          async (decodedText: string) => {
            if (handlingScanRef.current) return;
            await submitScan(decodedText);
          },
          () => {
            // Ignore frame-level decode misses
          }
        );

        if (cancelled) {
          await disposeTicketScanner(scanner);
          if (scannerRef.current === scanner) {
            scannerRef.current = null;
          }
        }
      } catch (error) {
        if (!cancelled) {
          setScannerError(
            error instanceof Error
              ? error.message
              : "Unable to access camera"
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
        void disposeTicketScanner(scanner);
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
            error instanceof Error ? error.message : "Failed to search users"
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

  const resultConfig = useMemo(() => {
    if (!lastResult) return null;

    switch (lastResult.status) {
      case "checked_in":
        return {
          icon: CheckCircle2,
          colors: "bg-success/15 text-success border-success/30",
          title: "Checked In",
        };
      case "already_used":
        return {
          icon: AlertTriangle,
          colors: "bg-amber-500/15 text-amber-500 border-amber-500/30",
          title: "Already Used",
        };
      case "revoked":
        return {
          icon: XCircle,
          colors: "bg-red-500/15 text-red-500 border-red-500/30",
          title: "Revoked",
        };
      default:
        return {
          icon: XCircle,
          colors: "bg-muted text-muted-foreground border-border",
          title: "Invalid",
        };
    }
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
          ? "Door staff assigned"
          : result.action === "reassigned"
          ? "Door staff reactivated"
          : "User already has access"
      );
      setSelectedUser(null);
      setStaffQuery("");
      setSuggestions([]);
      setShowSuggestions(false);
    } catch (error) {
      setStaffError(
        error instanceof Error ? error.message : "Failed to assign staff"
      );
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
      setStaffMessage("Door staff access revoked");
    } catch (error) {
      setStaffError(
        error instanceof Error ? error.message : "Failed to revoke staff"
      );
    } finally {
      setRemovingStaffUserId(null);
    }
  };

  if (accessLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-64 bg-muted animate-shimmer m-4 rounded-2xl" />
      </div>
    );
  }

  if (!canScan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            Check-in Access Required
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Only event managers or assigned door staff can scan tickets
          </p>
          <Link
            href={eventHref}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-fan text-white text-sm font-medium rounded-xl hover:bg-fan/90 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Event
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <Link
            href={eventHref}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">
              Check-in
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {event?.title ?? "Event"}
            </p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Scanner */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-border">
            <div className="w-8 h-8 bg-fan/10 rounded-lg flex items-center justify-center">
              <ScanLine className="w-4 h-4 text-fan" />
            </div>
            <h2 className="font-semibold text-foreground">Ticket Scanner</h2>
          </div>

          <div className="p-4">
            <div
              id="ticket-checkin-qr-region"
              className="min-h-[300px] bg-black/5 rounded-xl overflow-hidden"
            />

            {processingScan && (
              <p className="mt-3 text-xs text-center text-muted-foreground">
                Processing scan...
              </p>
            )}

            {scannerError && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 text-center">
                {scannerError}
              </div>
            )}

            {/* Manual Entry */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Manual entry</p>
              <div className="flex gap-2">
                <input
                  value={manualQrValue}
                  onChange={(e) => setManualQrValue(e.target.value)}
                  placeholder="Paste QR code (EPT1:...)"
                  className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-fan/50"
                />
                <button
                  type="button"
                  onClick={() => {
                    void submitScan(manualQrValue);
                    setManualQrValue("");
                  }}
                  disabled={!manualQrValue.trim() || processingScan}
                  className="px-4 py-2 bg-fan text-white text-sm font-medium rounded-xl hover:bg-fan/90 transition-colors disabled:opacity-50"
                >
                  Validate
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Last Result */}
        <section className="bg-card border border-border rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Last Scan
          </h2>

          <AnimatePresence mode="wait">
            {lastResult ? (
              <motion.div
                key={lastResult.status}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "border rounded-xl p-4",
                  resultConfig?.colors
                )}
              >
                <div className="flex items-center gap-3">
                  {resultConfig && <resultConfig.icon className="w-6 h-6" />}
                  <div className="flex-1">
                    <p className="font-semibold">{resultConfig?.title}</p>
                    <p className="text-sm opacity-90">
                      {formatResultMessage(lastResult)}
                    </p>
                  </div>
                </div>
                {lastResult.ticketCode && (
                  <p className="mt-2 text-xs opacity-75 font-mono">
                    {lastResult.ticketCode}
                  </p>
                )}
                {lastResult.usedAt && (
                  <p className="mt-1 text-xs opacity-75">
                    First checked in {formatTimestamp(lastResult.usedAt)}
                  </p>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-muted-foreground"
              >
                <QrCode className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Scan a ticket to see results</p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Door Staff Management */}
        {canManageStaff && (
          <section className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 p-4 border-b border-border">
              <div className="w-8 h-8 bg-band/10 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-band" />
              </div>
              <h2 className="font-semibold text-foreground">Door Staff</h2>
              <span className="ml-auto text-xs text-muted-foreground">
                {staff.length} assigned
              </span>
            </div>

            <div className="p-4 space-y-4">
              {canManageInActiveBand ? (
                <>
                  {/* Add Staff */}
                  <div ref={autocompleteRef} className="relative">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          value={staffQuery}
                          onChange={(e) => {
                            setStaffQuery(e.target.value);
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
                          placeholder="Search users..."
                          className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-band/50"
                        />

                        {/* Suggestions */}
                        <AnimatePresence>
                          {showSuggestions && staffQuery.trim().length >= 2 && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute z-30 mt-2 w-full max-h-64 overflow-y-auto bg-card border border-border rounded-xl shadow-xl"
                            >
                              {isSearchingUsers ? (
                                <div className="p-3 text-xs text-muted-foreground">
                                  Searching...
                                </div>
                              ) : suggestions.length > 0 ? (
                                suggestions.map((user) => (
                                  <button
                                    key={user.userId}
                                    type="button"
                                    onClick={() => handleSelectSuggestion(user)}
                                    className="w-full px-3 py-2 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0 flex items-center gap-3"
                                  >
                                    <AvatarImage
                                      src={user.avatar}
                                      alt={user.name}
                                      fallbackText={user.name}
                                      size={32}
                                      className="rounded-lg"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">
                                        {user.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {user.alreadyAssigned ? "Already assigned" : "Available"}
                                      </p>
                                    </div>
                                    {user.alreadyAssigned && (
                                      <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] rounded-full">
                                        Assigned
                                      </span>
                                    )}
                                  </button>
                                ))
                              ) : (
                                <div className="p-3 text-xs text-muted-foreground">
                                  No users found
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleAssignStaff()}
                        disabled={!selectedUser || assignPending}
                        className="px-4 py-2.5 bg-band text-white text-sm font-medium rounded-xl hover:bg-band/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <UserPlus className="w-4 h-4" />
                        Add
                      </button>
                    </div>

                    {staffMessage && (
                      <p className="mt-2 text-xs text-band">{staffMessage}</p>
                    )}
                    {staffError && (
                      <p className="mt-2 text-xs text-red-500">{staffError}</p>
                    )}
                  </div>

                  {/* Staff List */}
                  {staffLoading ? (
                    <div className="h-24 bg-muted rounded-xl animate-shimmer" />
                  ) : staff.length > 0 ? (
                    <div className="space-y-2">
                      {staff.map((member) => (
                        <div
                          key={member.userId}
                          className="flex items-center justify-between gap-3 p-3 bg-muted/50 border border-border rounded-xl"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <AvatarImage
                              src={member.avatar}
                              alt={member.name}
                              fallbackText={member.name}
                              size={36}
                              className="rounded-lg"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {member.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Door Staff
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleRemoveStaff(member.userId)}
                            disabled={removingStaffUserId === member.userId}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No door staff assigned yet
                    </p>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-500">
                  <Crown className="w-4 h-4" />
                  Switch to manager band workspace to edit door staff
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

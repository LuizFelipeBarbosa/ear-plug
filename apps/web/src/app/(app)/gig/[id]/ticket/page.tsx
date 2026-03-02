"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EventTicketPanel } from "@/components/events/EventTicketPanel";
import { useMyEventTicket } from "@/hooks/useEvents";
import type { Id } from "../../../../../../../../convex/_generated/dataModel";

interface TicketPageProps {
  params: { id: string };
}

export default function EventTicketPage({ params }: TicketPageProps) {
  const eventId = params.id as Id<"events">;
  const { ticket, isLoading, ensureTicket } = useMyEventTicket(eventId);

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          href={`/gig/${eventId}`}
          className="mb-5 inline-flex items-center gap-2 px-3.5 py-2.5 bg-card border border-border rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:border-fan/30 hover:bg-fan/5 transition-colors touch-target shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Event
        </Link>
        <h1 className="text-2xl font-bold text-foreground mb-3">Event Ticket</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Present this ticket at the venue entrance for one-time check-in.
        </p>
        {isLoading ? (
          <div className="h-80 border-2 border-border bg-muted animate-shimmer" />
        ) : ticket ? (
          <EventTicketPanel
            eventId={eventId}
            ticketPayload={ticket}
            isLoading={false}
            onEnsureTicket={ensureTicket}
            showOpenTicketLink={false}
          />
        ) : (
          <div className="border-2 border-border bg-muted p-6">
            <p className="text-sm text-muted-foreground mb-4">Ticket unavailable</p>
            <p className="text-sm text-muted-foreground mb-5">
              RSVP to this event first to access your ticket.
            </p>
            <Link
              href={`/gig/${eventId}`}
              className="inline-flex px-3 py-2 border border-fan/40 text-fan text-xs font-bold hover:bg-fan hover:text-foreground transition-colors"
            >
              Go to Event
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EventTicketPanel } from "@/components/events/EventTicketPanel";
import { useMyEventTicket } from "@/hooks/useEvents";
import type { Id } from "../../../../../../../../convex/_generated/dataModel";

interface TicketPageProps {
  params: { id: string };
}

export default function EventTicketPage({ params }: TicketPageProps) {
  const router = useRouter();
  const eventId = params.id as Id<"events">;
  const { ticket, isLoading, ensureTicket } = useMyEventTicket(eventId);

  return (
    <div className="min-h-screen bg-night px-4 py-6 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <button
          type="button"
          onClick={() => router.push(`/gig/${eventId}`)}
          className="mb-5 inline-flex items-center gap-2 px-3 py-2 border border-zinc-700 text-zinc-300 text-xs font-bold uppercase tracking-wider hover:border-zinc-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Event
        </button>

        <h1 className="text-2xl font-bold text-white uppercase tracking-tight mb-3">
          Event Ticket
        </h1>
        <p className="text-sm text-zinc-400 mb-6">
          Present this ticket at the venue entrance for one-time check-in.
        </p>

        {isLoading ? (
          <div className="h-80 border-2 border-zinc-800 bg-night-tertiary animate-shimmer" />
        ) : ticket ? (
          <EventTicketPanel
            eventId={eventId}
            ticketPayload={ticket}
            isLoading={false}
            onEnsureTicket={ensureTicket}
            showOpenTicketLink={false}
          />
        ) : (
          <div className="border-2 border-zinc-800 bg-night-tertiary p-6">
            <p className="text-sm text-zinc-300 uppercase tracking-wider mb-4">
              Ticket unavailable
            </p>
            <p className="text-sm text-zinc-500 mb-5">
              RSVP to this event first to access your ticket.
            </p>
            <Link
              href={`/gig/${eventId}`}
              className="inline-flex px-3 py-2 border border-lime/40 text-lime text-xs font-bold uppercase tracking-wider hover:bg-lime hover:text-night transition-colors"
            >
              Go to Event
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

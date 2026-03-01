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
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6">
      {" "}
      <div className="max-w-3xl mx-auto">
        {" "}
        <button
          type="button"
          onClick={() => router.push(`/gig/${eventId}`)}
          className="mb-5 inline-flex items-center gap-2 px-3 py-2 border border-border text-muted-foreground text-xs font-bold hover:border-zinc-500 transition-colors"
        >
          {" "}
          <ArrowLeft className="w-4 h-4" /> Back to Event{" "}
        </button>{" "}
        <h1 className="text-2xl font-bold text-foreground mb-3">
          {" "}
          Event Ticket{" "}
        </h1>{" "}
        <p className="text-sm text-muted-foreground mb-6">
          {" "}
          Present this ticket at the venue entrance for one-time check-in.{" "}
        </p>{" "}
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
            {" "}
            <p className="text-sm text-muted-foreground mb-4">
              {" "}
              Ticket unavailable{" "}
            </p>{" "}
            <p className="text-sm text-muted-foreground mb-5">
              {" "}
              RSVP to this event first to access your ticket.{" "}
            </p>{" "}
            <Link
              href={`/gig/${eventId}`}
              className="inline-flex px-3 py-2 border border-fan/40 text-fan text-xs font-bold hover:bg-fan hover:text-foreground transition-colors"
            >
              {" "}
              Go to Event{" "}
            </Link>{" "}
          </div>
        )}{" "}
      </div>{" "}
    </div>
  );
}

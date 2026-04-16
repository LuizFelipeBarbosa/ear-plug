import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  type EventPoll,
  hasCompletedEventPollAnswers,
  normalizeEventPoll,
  normalizeRsvpPollAnswers,
} from "./events";

type LegacyStoredPoll = {
  question?: string;
  options?: unknown[];
  questions?: unknown[];
} | null | undefined;

type LegacyStoredRsvp = Doc<"rsvps"> & {
  pollAnswerOptionId?: string;
};

type EventPollLookupCtx = {
  db: {
    get(id: Id<"events">): Promise<Doc<"events"> | null>;
  };
};

function isLegacyStoredPoll(poll: LegacyStoredPoll): boolean {
  return (
    !!poll &&
    !Array.isArray(poll.questions) &&
    typeof poll.question === "string" &&
    Array.isArray(poll.options)
  );
}

function hasLegacyStoredPollAnswer(rsvp: LegacyStoredRsvp): boolean {
  return (
    !Array.isArray(rsvp.pollAnswers) &&
    typeof rsvp.pollAnswerOptionId === "string" &&
    rsvp.pollAnswerOptionId.trim().length > 0
  );
}

async function loadNormalizedPollsByEventId(
  ctx: EventPollLookupCtx,
  eventIds: Id<"events">[],
): Promise<Map<Id<"events">, EventPoll | undefined>> {
  const uniqueEventIds = Array.from(new Set(eventIds));
  if (uniqueEventIds.length === 0) {
    return new Map();
  }

  const entries = await Promise.all(
    uniqueEventIds.map(async (eventId) => {
      const event = await ctx.db.get(eventId);
      return [eventId, normalizeEventPoll(event?.poll as any)] as const;
    }),
  );

  return new Map(entries);
}

export const backfillEventPollsBatch = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 100, 1), 500);
    const page = await ctx.db.query("events").order("asc").paginate({
      cursor: args.cursor ?? null,
      numItems: limit,
    });

    let migrated = 0;
    let skipped = 0;

    for (const event of page.page) {
      const legacyPoll = event.poll as LegacyStoredPoll;
      if (!isLegacyStoredPoll(legacyPoll)) {
        skipped += 1;
        continue;
      }

      const normalizedPoll = normalizeEventPoll(legacyPoll as any);
      if (!normalizedPoll) {
        skipped += 1;
        continue;
      }

      await ctx.db.patch(event._id, {
        poll: normalizedPoll,
      });
      migrated += 1;
    }

    return {
      nextCursor: page.continueCursor ?? undefined,
      done: page.isDone,
      stats: {
        scanned: page.page.length,
        migrated,
        skipped,
      },
    };
  },
});

export const backfillRsvpPollAnswersBatch = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 100, 1), 500);
    const page = await ctx.db.query("rsvps").order("asc").paginate({
      cursor: args.cursor ?? null,
      numItems: limit,
    });

    let migrated = 0;
    let skipped = 0;
    let invalid = 0;
    const pollsByEventId = await loadNormalizedPollsByEventId(
      ctx,
      page.page.map((rsvp) => rsvp.eventId),
    );

    for (const rsvp of page.page as LegacyStoredRsvp[]) {
      if (!hasLegacyStoredPollAnswer(rsvp)) {
        skipped += 1;
        continue;
      }

      const poll = pollsByEventId.get(rsvp.eventId);
      const normalizedAnswers = normalizeRsvpPollAnswers(rsvp, poll);

      if (!hasCompletedEventPollAnswers(poll, normalizedAnswers)) {
        invalid += 1;
        continue;
      }

      await ctx.db.patch(rsvp._id, {
        pollAnswers: normalizedAnswers,
        pollAnsweredAt: rsvp.pollAnsweredAt,
        // Explicitly clear the legacy single-answer field so the document no
        // longer carries an attribute that is absent from the new schema.
        // `ctx.db.patch` is a shallow merge, so without this the field would
        // persist and cause strict schema validation to reject the deploy.
        ...({ pollAnswerOptionId: undefined } as Record<string, unknown>),
      });
      migrated += 1;
    }

    return {
      nextCursor: page.continueCursor ?? undefined,
      done: page.isDone,
      stats: {
        scanned: page.page.length,
        migrated,
        skipped,
        invalid,
      },
    };
  },
});

// Convex only permits a single paginated query per function, so events and
// rsvps are scanned via two separate internal queries and the action
// interleaves them.
export const validateEventPollBackfillEventsPage = internalQuery({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 250, 1), 500);
    const eventPage = await ctx.db.query("events").order("asc").paginate({
      cursor: args.cursor ?? null,
      numItems: limit,
    });

    const legacyEventPolls = eventPage.page.filter((event) =>
      isLegacyStoredPoll(event.poll as LegacyStoredPoll)
    ).length;

    return {
      nextCursor: eventPage.continueCursor ?? undefined,
      done: eventPage.isDone,
      total: eventPage.page.length,
      legacyEventPolls,
    };
  },
});

export const validateEventPollBackfillRsvpsPage = internalQuery({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 250, 1), 500);
    const rsvpPage = await ctx.db.query("rsvps").order("asc").paginate({
      cursor: args.cursor ?? null,
      numItems: limit,
    });

    let legacyRsvpAnswers = 0;
    let migratedRsvpAnswers = 0;
    let invalidRsvpAnswers = 0;
    const pollsByEventId = await loadNormalizedPollsByEventId(
      ctx,
      rsvpPage.page.map((rsvp) => rsvp.eventId),
    );

    for (const rsvp of rsvpPage.page as LegacyStoredRsvp[]) {
      if (hasLegacyStoredPollAnswer(rsvp)) {
        legacyRsvpAnswers += 1;
      }

      if (!Array.isArray(rsvp.pollAnswers)) {
        continue;
      }

      const poll = pollsByEventId.get(rsvp.eventId);
      const normalizedAnswers = normalizeRsvpPollAnswers(rsvp, poll);
      if (hasCompletedEventPollAnswers(poll, normalizedAnswers)) {
        migratedRsvpAnswers += 1;
      } else {
        invalidRsvpAnswers += 1;
      }
    }

    return {
      nextCursor: rsvpPage.continueCursor ?? undefined,
      done: rsvpPage.isDone,
      total: rsvpPage.page.length,
      legacyRsvpAnswers,
      migratedRsvpAnswers,
      invalidRsvpAnswers,
    };
  },
});

export const validateEventPollBackfill = internalAction({
  args: {
    eventLimit: v.optional(v.number()),
    rsvpLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let eventCursor: string | undefined;
    let rsvpCursor: string | undefined;
    let eventsDone = false;
    let rsvpsDone = false;

    let totalEvents = 0;
    let totalRsvps = 0;
    let legacyEventPolls = 0;
    let legacyRsvpAnswers = 0;
    let invalidRsvpAnswers = 0;
    let migratedRsvpAnswers = 0;

    while (!eventsDone) {
      const page = await ctx.runQuery(
        internal.migrations.validateEventPollBackfillEventsPage,
        { cursor: eventCursor, limit: args.eventLimit },
      );
      totalEvents += page.total;
      legacyEventPolls += page.legacyEventPolls;
      eventCursor = page.nextCursor;
      eventsDone = page.done;
    }

    while (!rsvpsDone) {
      const page = await ctx.runQuery(
        internal.migrations.validateEventPollBackfillRsvpsPage,
        { cursor: rsvpCursor, limit: args.rsvpLimit },
      );
      totalRsvps += page.total;
      legacyRsvpAnswers += page.legacyRsvpAnswers;
      invalidRsvpAnswers += page.invalidRsvpAnswers;
      migratedRsvpAnswers += page.migratedRsvpAnswers;
      rsvpCursor = page.nextCursor;
      rsvpsDone = page.done;
    }

    return {
      totals: {
        events: totalEvents,
        rsvps: totalRsvps,
      },
      issues: {
        legacyEventPolls,
        legacyRsvpAnswers,
        invalidRsvpAnswers,
      },
      migrated: {
        rsvpsWithPollAnswers: migratedRsvpAnswers,
      },
      valid:
        legacyEventPolls === 0 &&
        legacyRsvpAnswers === 0 &&
        invalidRsvpAnswers === 0,
    };
  },
});

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

type ValidateEventPollBackfillPageResult = {
  nextCursor: {
    event?: string;
    rsvp?: string;
  };
  done: {
    events: boolean;
    rsvps: boolean;
  };
  totals: {
    events: number;
    rsvps: number;
  };
  issues: {
    legacyEventPolls: number;
    legacyRsvpAnswers: number;
    invalidRsvpAnswers: number;
  };
  migrated: {
    rsvpsWithPollAnswers: number;
  };
  validPage: boolean;
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

export const validateEventPollBackfillPage = internalQuery({
  args: {
    eventCursor: v.optional(v.string()),
    rsvpCursor: v.optional(v.string()),
    scanEvents: v.optional(v.boolean()),
    scanRsvps: v.optional(v.boolean()),
    eventLimit: v.optional(v.number()),
    rsvpLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const eventLimit = Math.min(Math.max(args.eventLimit ?? 250, 1), 500);
    const rsvpLimit = Math.min(Math.max(args.rsvpLimit ?? 250, 1), 500);
    const scanEvents = args.scanEvents ?? true;
    const scanRsvps = args.scanRsvps ?? true;

    const [eventPage, rsvpPage] = await Promise.all([
      scanEvents
        ? ctx.db.query("events").order("asc").paginate({
            cursor: args.eventCursor ?? null,
            numItems: eventLimit,
          })
        : Promise.resolve({
            page: [] as Doc<"events">[],
            isDone: true,
            continueCursor: undefined,
          }),
      scanRsvps
        ? ctx.db.query("rsvps").order("asc").paginate({
            cursor: args.rsvpCursor ?? null,
            numItems: rsvpLimit,
          })
        : Promise.resolve({
            page: [] as Doc<"rsvps">[],
            isDone: true,
            continueCursor: undefined,
          }),
    ]);

    const legacyEventPolls = eventPage.page.filter((event) =>
      isLegacyStoredPoll(event.poll as LegacyStoredPoll)
    ).length;

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
      nextCursor: {
        event: eventPage.continueCursor ?? undefined,
        rsvp: rsvpPage.continueCursor ?? undefined,
      },
      done: {
        events: eventPage.isDone,
        rsvps: rsvpPage.isDone,
      },
      totals: {
        events: eventPage.page.length,
        rsvps: rsvpPage.page.length,
      },
      issues: {
        legacyEventPolls,
        legacyRsvpAnswers,
        invalidRsvpAnswers,
      },
      migrated: {
        rsvpsWithPollAnswers: migratedRsvpAnswers,
      },
      validPage:
        legacyEventPolls === 0 &&
        legacyRsvpAnswers === 0 &&
        invalidRsvpAnswers === 0,
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

    while (!eventsDone || !rsvpsDone) {
      const page: ValidateEventPollBackfillPageResult = await ctx.runQuery(
        internal.migrations.validateEventPollBackfillPage,
        {
          eventCursor,
          rsvpCursor,
          scanEvents: !eventsDone,
          scanRsvps: !rsvpsDone,
          eventLimit: args.eventLimit,
          rsvpLimit: args.rsvpLimit,
        },
      );

      totalEvents += page.totals.events;
      totalRsvps += page.totals.rsvps;
      legacyEventPolls += page.issues.legacyEventPolls;
      legacyRsvpAnswers += page.issues.legacyRsvpAnswers;
      invalidRsvpAnswers += page.issues.invalidRsvpAnswers;
      migratedRsvpAnswers += page.migrated.rsvpsWithPollAnswers;

      eventCursor = page.nextCursor.event;
      rsvpCursor = page.nextCursor.rsvp;
      eventsDone = page.done.events;
      rsvpsDone = page.done.rsvps;
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

import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import {
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

    for (const rsvp of page.page as LegacyStoredRsvp[]) {
      if (!hasLegacyStoredPollAnswer(rsvp)) {
        skipped += 1;
        continue;
      }

      const event = await ctx.db.get(rsvp.eventId);
      const poll = normalizeEventPoll(event?.poll as any);
      const normalizedAnswers = normalizeRsvpPollAnswers(rsvp, poll);

      if (!hasCompletedEventPollAnswers(poll, normalizedAnswers)) {
        invalid += 1;
        continue;
      }

      await ctx.db.patch(rsvp._id, {
        pollAnswers: normalizedAnswers,
        pollAnsweredAt: rsvp.pollAnsweredAt,
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

export const validateEventPollBackfill = internalQuery({
  args: {},
  handler: async (ctx) => {
    const [events, rsvps] = await Promise.all([
      ctx.db.query("events").collect(),
      ctx.db.query("rsvps").collect(),
    ]);

    const legacyEventPolls = events.filter((event) =>
      isLegacyStoredPoll(event.poll as LegacyStoredPoll)
    ).length;

    let legacyRsvpAnswers = 0;
    let migratedRsvpAnswers = 0;
    let invalidRsvpAnswers = 0;

    for (const rsvp of rsvps as LegacyStoredRsvp[]) {
      if (hasLegacyStoredPollAnswer(rsvp)) {
        legacyRsvpAnswers += 1;
      }

      if (!Array.isArray(rsvp.pollAnswers)) {
        continue;
      }

      const event = await ctx.db.get(rsvp.eventId);
      const poll = normalizeEventPoll(event?.poll as any);
      const normalizedAnswers = normalizeRsvpPollAnswers(rsvp, poll);
      if (hasCompletedEventPollAnswers(poll, normalizedAnswers)) {
        migratedRsvpAnswers += 1;
      } else {
        invalidRsvpAnswers += 1;
      }
    }

    return {
      totals: {
        events: events.length,
        rsvps: rsvps.length,
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

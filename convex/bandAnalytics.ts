/**
 * @fileoverview Convex queries for band analytics.
 * Handles analytics data for band dashboards, including event performance,
 * audience breakdown, and poll response analytics.
 * @module convex/bandAnalytics
 */

import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireBandMember } from "./utils/permissions";
import { normalizeUsLocation } from "./utils/location";
import { listBandParticipatingEvents } from "./bands";
import {
  hasCompletedEventPollAnswers,
  normalizeEventPoll,
  normalizeRsvpPollAnswers,
} from "./events";

function normalizeAudienceLocation(location: string | undefined | null) {
  const normalized = normalizeUsLocation(location);
  if (!normalized) {
    return null;
  }

  return {
    key: normalized.toLocaleLowerCase(),
    label: normalized,
  };
}

function buildPollAnalyticsForEvent(
  event: Pick<Doc<"events">, "_id" | "title" | "dateTime" | "poll">,
  rsvps: Doc<"rsvps">[]
) {
  const poll = normalizeEventPoll(event.poll);
  if (!poll || typeof event.dateTime !== "number" || !Number.isFinite(event.dateTime)) {
    return null;
  }

  const answeredRsvps = rsvps
    .map((rsvp) => {
      const answers = normalizeRsvpPollAnswers(rsvp, poll);
      return hasCompletedEventPollAnswers(poll, answers) ? answers : null;
    })
    .filter((answers): answers is NonNullable<typeof answers> => answers !== null);

  const responseCount = answeredRsvps.length;
  const eligibleRsvpCount = rsvps.length;
  const responseRate =
    eligibleRsvpCount > 0 ? (responseCount / eligibleRsvpCount) * 100 : 0;

  const answerCountsByQuestion = new Map<string, Map<string, number>>();
  for (const answers of answeredRsvps) {
    for (const answer of answers) {
      const optionCounts =
        answerCountsByQuestion.get(answer.questionId) ?? new Map<string, number>();
      optionCounts.set(
        answer.optionId,
        (optionCounts.get(answer.optionId) ?? 0) + 1
      );
      answerCountsByQuestion.set(answer.questionId, optionCounts);
    }
  }

  const questions = poll.questions.map((question) => {
    const optionCounts = answerCountsByQuestion.get(question.id);
    const options = question.options.map((option) => {
      const count = optionCounts?.get(option.id) ?? 0;
      return {
        id: option.id,
        label: option.label,
        count,
        percentage: responseCount > 0 ? (count / responseCount) * 100 : 0,
      };
    });

    const topOption =
      [...options].sort((left, right) => {
        if (right.count !== left.count) {
          return right.count - left.count;
        }
        return left.label.localeCompare(right.label);
      })[0] ?? null;

    return {
      id: question.id,
      question: question.question,
      topOption:
        topOption && topOption.count > 0
          ? {
              id: topOption.id,
              label: topOption.label,
              count: topOption.count,
              percentage: topOption.percentage,
            }
          : null,
      options,
    };
  });

  return {
    eventId: event._id,
    eventTitle: event.title?.trim() || "Untitled Gig",
    dateTime: event.dateTime,
    responseCount,
    eligibleRsvpCount,
    responseRate,
    questions,
  };
}

/**
 * Gets analytics data for a band's dashboard charts and performance KPIs.
 * Includes total RSVPs, show count, checked-in attendance stats, chart data, and
 * audience breakdown percentages.
 *
 * @param bandId - The Convex ID of the band
 * @returns Analytics data object with chart-ready data and attendance KPI metrics
 * @throws Error if not authenticated or band not found
 */
export const getAnalytics = query({
  args: { bandId: v.id("bands") },
  handler: async (ctx, args) => {
    await requireBandMember(ctx, args.bandId);

    const band = await ctx.db.get(args.bandId);
    if (!band) {
      throw new Error("Band not found");
    }

    // Get all events this band hosts or co-hosts.
    const events = await listBandParticipatingEvents(ctx, args.bandId);

    // Get past events sorted by date (most recent first)
    const now = Date.now();
    const pastEvents = events
      .filter(
        (
          e
        ): e is typeof e & {
          dateTime: number;
        } => typeof e.dateTime === "number"
      )
      .filter((e) => e.dateTime < now)
      .sort((a, b) => b.dateTime - a.dateTime);

    const rsvpsByEventId = new Map<string, Doc<"rsvps">[]>();
    const attendedByEventId = new Map<string, number>();
    await Promise.all(
      events.map(async (event) => {
        const eventRsvps = await ctx.db
          .query("rsvps")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect();

        rsvpsByEventId.set(event._id, eventRsvps);

        if (typeof event.dateTime !== "number" || event.dateTime >= now) {
          return;
        }

        const attendedCount = eventRsvps.reduce(
          (sum, rsvp) => sum + ((rsvp.attendanceStatus ?? "on_list") === "attended" ? 1 : 0),
          0
        );
        attendedByEventId.set(event._id, attendedCount);
      })
    );

    const latestPastEvents = [...pastEvents].slice(0, 8);

    const venueNameCache = new Map<string, string>();
    const getVenueName = async (
      venueId: (typeof events)[number]["venueId"]
    ): Promise<string> => {
      if (!venueId) {
        return "Unknown Venue";
      }
      const cached = venueNameCache.get(venueId);
      if (cached) {
        return cached;
      }
      const venue = await ctx.db.get(venueId);
      const resolved = venue?.name || "Unknown Venue";
      venueNameCache.set(venueId, resolved);
      return resolved;
    };

    // Prepare chart data
    const eventComparison = await Promise.all(
      latestPastEvents.reverse().map(async (event) => {
        return {
          name: new Date(event.dateTime).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          rsvps: event.rsvpCount,
          attended: attendedByEventId.get(event._id) ?? 0,
          venueName: await getVenueName(event.venueId),
        };
      })
    );

    const totalCheckedInAcrossPastEvents = pastEvents.reduce(
      (sum, event) => sum + (attendedByEventId.get(event._id) ?? 0),
      0
    );
    const averageAttendancePerShow =
      pastEvents.length > 0 ? totalCheckedInAcrossPastEvents / pastEvents.length : 0;

    const bestEvent =
      pastEvents.length > 0
        ? [...pastEvents].sort((a, b) => {
            const attendedDiff =
              (attendedByEventId.get(b._id) ?? 0) - (attendedByEventId.get(a._id) ?? 0);
            if (attendedDiff !== 0) {
              return attendedDiff;
            }
            return b.dateTime - a.dateTime;
          })[0]
        : null;

    const lowestEvent =
      pastEvents.length > 0
        ? [...pastEvents].sort((a, b) => {
            const attendedDiff =
              (attendedByEventId.get(a._id) ?? 0) - (attendedByEventId.get(b._id) ?? 0);
            if (attendedDiff !== 0) {
              return attendedDiff;
            }
            return b.dateTime - a.dateTime;
          })[0]
        : null;

    const [bestAttendanceShow, lowestShow] = await Promise.all(
      [bestEvent, lowestEvent].map(async (event) => {
        if (!event) {
          return null;
        }

        return {
          eventId: event._id,
          eventName: event.title || "Untitled Show",
          venueName: await getVenueName(event.venueId),
          dateTime: event.dateTime,
          attended: attendedByEventId.get(event._id) ?? 0,
        };
      })
    );

    const totalRsvps = events.reduce((sum, e) => sum + e.rsvpCount, 0);
    const audienceVisitCounts = new Map<Id<"users">, number>();
    const audienceAttendedCounts = new Map<Id<"users">, number>();
    for (const eventRsvps of rsvpsByEventId.values()) {
      for (const rsvp of eventRsvps) {
        const key = rsvp.userId;
        audienceVisitCounts.set(key, (audienceVisitCounts.get(key) ?? 0) + 1);

        if ((rsvp.attendanceStatus ?? "on_list") === "attended") {
          audienceAttendedCounts.set(
            key,
            (audienceAttendedCounts.get(key) ?? 0) + 1
          );
        }
      }
    }

    let returningAudienceCount = 0;
    let newAudienceCount = 0;
    for (const visitCount of audienceVisitCounts.values()) {
      if (visitCount > 1) {
        returningAudienceCount += 1;
      } else {
        newAudienceCount += 1;
      }
    }

    const audienceUsers = await Promise.all(
      [...audienceVisitCounts.keys()].map((userId) => ctx.db.get(userId))
    );
    const audienceByLocation = new Map<
      string,
      {
        location: string;
        fanCount: number;
        rsvpCount: number;
        attendedCount: number;
      }
    >();
    let locatedFanCount = 0;
    let fansWithoutLocationCount = 0;

    for (const audienceUser of audienceUsers) {
      if (!audienceUser) {
        continue;
      }

      const normalizedLocation = normalizeAudienceLocation(audienceUser.location);
      if (!normalizedLocation) {
        fansWithoutLocationCount += 1;
        continue;
      }

      locatedFanCount += 1;
      const existingEntry = audienceByLocation.get(normalizedLocation.key) ?? {
        location: normalizedLocation.label,
        fanCount: 0,
        rsvpCount: 0,
        attendedCount: 0,
      };

      existingEntry.fanCount += 1;
      existingEntry.rsvpCount += audienceVisitCounts.get(audienceUser._id) ?? 0;
      existingEntry.attendedCount +=
        audienceAttendedCounts.get(audienceUser._id) ?? 0;
      audienceByLocation.set(normalizedLocation.key, existingEntry);
    }

    const locationBreakdown = [...audienceByLocation.values()]
      .sort((left, right) => {
        if (right.fanCount !== left.fanCount) {
          return right.fanCount - left.fanCount;
        }
        if (right.rsvpCount !== left.rsvpCount) {
          return right.rsvpCount - left.rsvpCount;
        }
        if (right.attendedCount !== left.attendedCount) {
          return right.attendedCount - left.attendedCount;
        }
        return left.location.localeCompare(right.location);
      })
      .map((entry) => ({
        ...entry,
        share:
          locatedFanCount > 0 ? (entry.fanCount / locatedFanCount) * 100 : 0,
      }));

    const polledEvents = events
      .filter(
        (
          event
        ): event is typeof event & {
          dateTime: number;
          poll: NonNullable<typeof event.poll>;
        } =>
          typeof event.dateTime === "number" &&
          Number.isFinite(event.dateTime) &&
          !!normalizeEventPoll(event.poll)
      )
      .sort((left, right) => {
        const leftUpcoming = left.dateTime >= now;
        const rightUpcoming = right.dateTime >= now;
        if (leftUpcoming !== rightUpcoming) {
          return leftUpcoming ? -1 : 1;
        }
        return leftUpcoming
          ? left.dateTime - right.dateTime
          : right.dateTime - left.dateTime;
      });

    const pollAnalyticsByEventId = new Map<
      string,
      NonNullable<ReturnType<typeof buildPollAnalyticsForEvent>>
    >();
    for (const event of polledEvents) {
      const analyticsForEvent = buildPollAnalyticsForEvent(
        event,
        rsvpsByEventId.get(event._id) ?? []
      );
      if (analyticsForEvent) {
        pollAnalyticsByEventId.set(event._id, analyticsForEvent);
      }
    }

    const pollAnalyticsList = polledEvents
      .map((event) => pollAnalyticsByEventId.get(event._id))
      .filter(
        (
          value
        ): value is NonNullable<typeof value> => value !== undefined
      );

    const totalPollResponses = pollAnalyticsList.reduce(
      (sum, event) => sum + event.responseCount,
      0
    );
    const averagePollResponseRate =
      pollAnalyticsList.length > 0
        ? pollAnalyticsList.reduce((sum, event) => sum + event.responseRate, 0) /
          pollAnalyticsList.length
        : 0;

    return {
      totalRsvps,
      eventCount: events.length,
      averageAttendancePerShow,
      bestAttendanceShow,
      lowestShow,
      eventComparison,
      trafficData: [
        { name: "Returning", value: returningAudienceCount },
        { name: "New", value: newAudienceCount },
      ],
      locationSummary: {
        trackedLocationCount: locationBreakdown.length,
        locatedFanCount,
        fansWithoutLocationCount,
        topLocation: locationBreakdown[0] ?? null,
      },
      locationBreakdown,
      pollSummary: {
        polledGigCount: pollAnalyticsList.length,
        totalResponses: totalPollResponses,
        averageResponseRate: averagePollResponseRate,
      },
      pollSnapshot: pollAnalyticsList[0] ?? null,
      pollBreakdown: pollAnalyticsList.slice(0, 6).map((event) => ({
        eventId: event.eventId,
        eventTitle: event.eventTitle,
        dateTime: event.dateTime,
        responseCount: event.responseCount,
        eligibleRsvpCount: event.eligibleRsvpCount,
        responseRate: event.responseRate,
        questions: event.questions.map((question) => ({
          id: question.id,
          question: question.question,
          options: question.options,
        })),
      })),
    };
  },
});

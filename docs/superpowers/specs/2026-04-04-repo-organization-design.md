# Repository Organization Cleanup

**Date:** 2026-04-04
**Approach:** Targeted splits + cleanup (Approach B — split where it hurts, clean the rest)
**Scope:** Moderate — file splits, directory reorganization, import updates. No package boundary changes.

---

## 1. Convex Backend Splits

### 1a. Split `events.ts` (3,285 lines)

Split into focused modules by responsibility:

| New File | Responsibility |
|---|---|
| `events.ts` | Core event CRUD — create, update, delete, get, list queries |
| `eventRsvps.ts` | RSVP toggling, guest lists, attendance tracking |
| `eventTickets.ts` | Ticket generation, validation, check-in scanning |
| `eventPolls.ts` | Event poll creation and voting (if substantial enough to warrant its own file; otherwise fold into `events.ts`) |

### 1b. Split `bands.ts` (1,414 lines)

| New File | Responsibility |
|---|---|
| `bands.ts` | Core band CRUD and profile queries |
| `bandAnalytics.ts` | Analytics queries — fan locations, engagement stats, dashboard data |

### 1c. Archive completed migrations

Move completed, already-run migration functions out of `migrations.ts` into `convex/_archive/migrations-v1.ts`. Keep only active or future migrations in `migrations.ts`. If all migrations are complete, `migrations.ts` can be removed entirely with only the archive remaining.

### Constraints

- Convex auto-generates API types per file, so splitting a file changes the API path (e.g., `api.events.rsvpToEvent` becomes `api.eventRsvps.rsvpToEvent`).
- All call sites in web and mobile apps must be updated to reference the new file-based API paths.
- No behavioral changes — only file reorganization and import updates.

---

## 2. Shared Package Reorganization

### 2a. Split `types/index.ts` (965 lines)

| New File | Contents |
|---|---|
| `types/user.ts` | `UserRole`, `ProfileMode`, user-related interfaces |
| `types/band.ts` | `BandMemberRole`, `BandInvite`, `BandInviteStatus`, band interfaces |
| `types/event.ts` | `EventStatus`, `EventAddressVisibility`, `EventParticipationRole`, event/gig interfaces |
| `types/ticket.ts` | `TicketStatus`, ticket interfaces |
| `types/notification.ts` | `NotificationType`, notification interfaces |
| `types/venue.ts` | Venue-related types, `OpenDateStatus`, `ApplicationStatus` |
| `types/message.ts` | Conversation/message types |
| `types/index.ts` | Barrel re-export of all above |

### 2b. Split `utils/index.ts` (735 lines)

| New File | Contents |
|---|---|
| `utils/formatting.ts` | Date formatting, price formatting, display helpers |
| `utils/geo.ts` | `calculateDistance`, location utilities |
| `utils/collections.ts` | `groupBy`, array/object helpers |
| `utils/index.ts` | Barrel re-export of all above |

### 2c. Leave as-is

- `validation/index.ts` (516 lines) — not large enough to split
- `constants/index.ts` (351 lines) — not large enough to split

### Constraints

- Barrel `index.ts` re-exports at each level ensure **zero breaking changes** to consumers. Apps continue importing from `@ear-plug/shared`.
- No new packages or build config changes.

---

## 3. Root & Docs Cleanup

### 3a. Root clutter

| Action | Target |
|---|---|
| Add to `.gitignore` | `convex-err.log`, `pnpm-err.log`, `.DS_Store`, `tmp/` |
| Delete from repo | `tmp/` directory, `convex-err.log`, `pnpm-err.log` |

### 3b. Docs consolidation

| Action | Details |
|---|---|
| Remove or merge `_discovery/` | Auto-generated exploration docs. Merge any valuable content into relevant existing directories (`architecture/`, `api/`, etc.) before deleting. |
| Update `docs/README.md` | Fix database table count (13 -> 23), review for other stale references |
| Evaluate thin directories | Check if `docs/examples/`, `docs/reference/`, `docs/guides/` justify separate directories or should be merged |

### 3c. Opportunistic cleanup (during splits)

| Action | Details |
|---|---|
| Remove `use-places-autocomplete` | Unused dependency in `apps/web/package.json` |
| Remove `console.log("Share cancelled")` | Debug leftover in `apps/web/src/app/(app)/gig/[id]/page.tsx` |

### Out of scope

- Deprecated `genre` field and `UserRole` type — these are data migration concerns, not organizational.
- Convex schema validation errors (`booking_accepted`/`booking_request` notification types) — separate fix.
- Web/mobile component structure alignment — not enough divergence to justify churn.

---

## Verification

After all changes:

1. `pnpm typecheck` passes across all packages
2. `pnpm lint` passes
3. `pnpm build:web` succeeds
4. Convex deployment (`npx convex dev`) starts without errors
5. No broken imports — grep for old API paths confirms zero remaining references

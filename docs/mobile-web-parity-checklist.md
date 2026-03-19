# Mobile/Web Parity Checklist

Web remains the source of truth. This checklist tracks whether the mobile app matches the current web v1 route behavior and information hierarchy.

## Auth and app shell

| Surface | Web source | Mobile status | Notes |
| --- | --- | --- | --- |
| Native auth shell | `apps/web/src/app/page.tsx` + auth flows | Implemented | Phone, Google, Apple auth present. |
| Personal/band workspace switching | Web profile workspace controls | Implemented | Creation, switching, invites all in mobile workspace manager. |
| Role-aware tab shell | Web app shell | Implemented | Personal and band tabs switch by workspace mode. |

## Fan workspace

| Surface | Web source | Mobile status | Notes |
| --- | --- | --- | --- |
| Discover | `apps/web/src/components/fan/DiscoverView.tsx` | Implemented | Search, filters, map/list, richer cards. |
| Calendar | `apps/web/src/components/fan/CalendarView.tsx` | Implemented | Stats, hero card, grouped sections. |
| Notifications | `apps/web/src/components/fan/NotificationsView.tsx` | Implemented | Stats, filters, grouped states, actions. |
| Profile | `apps/web/src/components/fan/ProfileView.tsx` | Implemented | Overview, saved, activity, settings, workspace manager. |
| Public band profile | `apps/web/src/app/(app)/bands/[id]/page.tsx` | Implemented | Follow state, profile info, past shows. |
| Public fan profile | `apps/web/src/app/(app)/fans/[id]/page.tsx` | Implemented | Stats, genres, saved artists, activity. |

## Band workspace

| Surface | Web source | Mobile status | Notes |
| --- | --- | --- | --- |
| Dashboard | `apps/web/src/components/band/BandDashboard.tsx` | Implemented | Header, stats, next show, venues, open dates. |
| Shows / calendar | `apps/web/src/components/band/BandCalendar.tsx` | Implemented | Filtered list, create/edit, tentative/confirmed flows. |
| Messages | `apps/web/src/components/band/BandMessages.tsx` | Implemented | Inbox, co-host invites, thread view. |
| Analytics | `apps/web/src/components/band/BandAnalyticsView.tsx` | Implemented | Overview, highlights, comparison, audience chart. |
| Band profile | `apps/web/src/components/band/BandProfile.tsx` | Implemented | Overview, media, shows, settings, member management. |

## Shared route surfaces

| Surface | Web source | Mobile status | Notes |
| --- | --- | --- | --- |
| Event detail | `apps/web/src/app/(app)/gig/[id]/page.tsx` | Implemented | Fan/band contextual actions retained. |
| Ticket | `apps/web/src/app/(app)/gig/[id]/ticket/page.tsx` | Verify | Functional parity exists; visual QA still required. |
| Check-in | `apps/web/src/app/(app)/gig/[id]/check-in/page.tsx` | Verify | Functional parity exists; visual QA still required. |

## Final validation items

- Verify iOS and Android layouts for every route in this checklist.
- Verify personal and band workspaces with multiple memberships and role levels.
- Verify ticket and check-in screens after the broader UI refresh to ensure they do not look visually behind the main app shell.
- Mark any intentional mobile adaptation explicitly before release.

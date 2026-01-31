# Ear-Plug MVP — Product Requirements Document

## Document Info

| Field         | Value                               |
| ------------- | ----------------------------------- |
| Project Name  | Ear-Plug                            |
| Tagline       | "Listen Local"                      |
| Document Type | Product Requirements Document (PRD) |
| Platform      | Mobile-first Web Application        |

---

## 1. Product Overview

### 1.1 Purpose

Ear-Plug is a dual-sided platform designed to connect the local live music ecosystem by serving two distinct user groups:

- **Fans** — Discover local shows, follow bands, and engage with the music scene
- **Musicians/Bands** — Promote performances, find gig opportunities, and grow their fanbase

### 1.2 Target Market

- Geographic Focus: Berkeley / San Francisco Bay Area (MVP)
- Primary Users: Local music fans and independent musicians/bands

---

## 2. User Roles & Personas

### 2.1 Fan Persona

| Attribute         | Description                                                                        |
| ----------------- | ---------------------------------------------------------------------------------- |
| Goal              | Discover and attend local live music events                                        |
| Key Actions       | Browse events, search, filter by genre/distance, like events, RSVP, follow artists |
| Value Proposition | Easy discovery of nearby shows with personalized recommendations                   |

### 2.2 Musician/Band Persona

| Attribute         | Description                                                                           |
| ----------------- | ------------------------------------------------------------------------------------- |
| Goal              | Promote shows, find gig opportunities, grow fanbase                                   |
| Key Actions       | View dashboard metrics, apply to open dates, communicate with venues, track analytics |
| Value Proposition | Centralized platform for booking management and audience growth                       |

---

## 3. Functional Requirements

### 3.1 Authentication & Onboarding

| ID      | Requirement                                                                | Priority |
| ------- | -------------------------------------------------------------------------- | -------- |
| AUTH-01 | System shall display role-selection screen with immersive video background | High     |
| AUTH-02 | User shall choose between "Fan" or "Musician" persona during onboarding    | High     |
| AUTH-03 | System shall persist user role in localStorage                             | High     |
| AUTH-04 | System shall persist authentication state across sessions                  | High     |
| AUTH-05 | System shall route user to appropriate home view based on selected role    | High     |

---

### 3.2 Fan Features

#### 3.2.1 Map-Based Event Discovery

| ID         | Requirement                                                                                  | Priority |
| ---------- | -------------------------------------------------------------------------------------------- | -------- |
| FAN-MAP-01 | System shall display interactive map of Bay Area with event pins                             | High     |
| FAN-MAP-02 | Map pins shall be clickable and show event popup with quick links                            | High     |
| FAN-MAP-03 | System shall provide search bar for events, bands, or venues                                 | High     |
| FAN-MAP-04 | System shall support distance radius filter (1-50 miles)                                     | Medium   |
| FAN-MAP-05 | System shall support genre filtering (Indie, Rock, Jazz, Electronic, Folk, Pop, Alternative) | Medium   |
| FAN-MAP-06 | System shall display scrollable "Near You" event list below map                              | High     |

#### 3.2.2 Event Cards

| ID          | Requirement                                                       | Priority |
| ----------- | ----------------------------------------------------------------- | -------- |
| FAN-CARD-01 | Event card shall display: image, title, venue name, address, date | High     |
| FAN-CARD-02 | Event card shall include heart icon for liking/saving             | High     |
| FAN-CARD-03 | Event card shall link to event detail page on tap                 | High     |
| FAN-CARD-04 | Liked status shall persist via localStorage                       | High     |

#### 3.2.3 Event Details Page

| ID         | Requirement                                                                                  | Priority |
| ---------- | -------------------------------------------------------------------------------------------- | -------- |
| FAN-DET-01 | Page shall display full event image header                                                   | High     |
| FAN-DET-02 | Page shall include share and like action buttons                                             | Medium   |
| FAN-DET-03 | Page shall display band info: avatar, name, genre                                            | High     |
| FAN-DET-04 | Page shall show details grid: Date/Time, Venue, RSVP count (with progress bar), Ticket price | High     |
| FAN-DET-05 | Page shall display venue location with capacity info                                         | Medium   |
| FAN-DET-06 | Page shall show event and band descriptions                                                  | Medium   |
| FAN-DET-07 | RSVP button shall toggle between "RSVP to Event" and "You're Going!" states                  | High     |
| FAN-DET-08 | Page shall display remaining spots indicator                                                 | Medium   |

#### 3.2.4 Fan Calendar (My Events)

| ID         | Requirement                                                 | Priority |
| ---------- | ----------------------------------------------------------- | -------- |
| FAN-CAL-01 | Calendar shall display two sections: RSVPs and Liked Events | High     |
| FAN-CAL-02 | RSVPs section shall show confirmed attendance events        | High     |
| FAN-CAL-03 | Liked Events section shall exclude events already in RSVPs  | High     |

#### 3.2.5 Fan Notifications

| ID         | Requirement                                             | Priority |
| ---------- | ------------------------------------------------------- | -------- |
| FAN-NOT-01 | System shall display event reminder notifications       | Medium   |
| FAN-NOT-02 | System shall notify of lineup changes and updates       | Medium   |
| FAN-NOT-03 | System shall notify of new events from followed artists | Medium   |
| FAN-NOT-04 | System shall notify of new events at nearby venues      | Low      |

#### 3.2.6 Fan Profile

| ID         | Requirement                                                  | Priority |
| ---------- | ------------------------------------------------------------ | -------- |
| FAN-PRO-01 | Profile shall display avatar, name, and location             | High     |
| FAN-PRO-02 | Profile shall show "shows attended" count badge              | Medium   |
| FAN-PRO-03 | Profile shall display top genres as clickable filter buttons | Medium   |
| FAN-PRO-04 | Genre buttons shall filter home map view when tapped         | Medium   |
| FAN-PRO-05 | Profile shall show "member since" date                       | Low      |
| FAN-PRO-06 | Profile shall display saved artists grid                     | Medium   |
| FAN-PRO-07 | Profile shall display saved venues grid                      | Medium   |
| FAN-PRO-08 | Profile shall include dev mode switcher (development only)   | Low      |

---

### 3.3 Band/Musician Features

#### 3.3.1 Band Dashboard Home

| ID           | Requirement                                                                 | Priority |
| ------------ | --------------------------------------------------------------------------- | -------- |
| BAND-HOME-01 | Dashboard shall display stats grid: Shows this month, Total RSVPs, New fans | High     |
| BAND-HOME-02 | Dashboard shall show horizontally scrollable "Suggested Venues" carousel    | High     |
| BAND-HOME-03 | Venue cards shall display: image, name, city, capacity                      | High     |
| BAND-HOME-04 | Dashboard shall list "Open Dates" gig opportunities                         | High     |
| BAND-HOME-05 | Open dates shall show: venue, date, location, offered pay                   | High     |
| BAND-HOME-06 | Each open date shall have "Apply" button                                    | High     |
| BAND-HOME-07 | Genre filter from profile shall filter venues and opportunities             | Medium   |

#### 3.3.2 Band Calendar

| ID          | Requirement                                                                        | Priority |
| ----------- | ---------------------------------------------------------------------------------- | -------- |
| BAND-CAL-01 | Calendar shall display scheduled performances                                      | High     |
| BAND-CAL-02 | Events shall show status badge: Confirmed (green), Hold (yellow), Available (blue) | High     |
| BAND-CAL-03 | Each entry shall display venue name, date, and time                                | High     |

#### 3.3.3 Band Messages

| ID          | Requirement                                                                | Priority |
| ----------- | -------------------------------------------------------------------------- | -------- |
| BAND-MSG-01 | Inbox shall list conversations with venue names                            | High     |
| BAND-MSG-02 | Each conversation shall show last message preview                          | High     |
| BAND-MSG-03 | Each conversation shall show timestamp                                     | High     |
| BAND-MSG-04 | Unread messages shall be highlighted with primary color border             | Medium   |
| BAND-MSG-05 | Messages shall support coordination for sound checks, set times, logistics | High     |

#### 3.3.4 Band Profile

| ID          | Requirement                                                                            | Priority |
| ----------- | -------------------------------------------------------------------------------------- | -------- |
| BAND-PRO-01 | Profile shall display band info card: image, name, genre, location, member count       | High     |
| BAND-PRO-02 | Profile shall show social media links: Spotify, Apple Music, Instagram, TikTok/YouTube | Medium   |
| BAND-PRO-03 | Profile shall include Analytics Report section                                         | High     |
| BAND-PRO-04 | Profile shall include media gallery with upload capability                             | Medium   |

#### 3.3.5 Analytics Report

| ID          | Requirement                                                            | Priority |
| ----------- | ---------------------------------------------------------------------- | -------- |
| BAND-ANA-01 | Report shall display header with report date, venue location, capacity | High     |
| BAND-ANA-02 | Report shall prominently show total RSVP count                         | High     |
| BAND-ANA-03 | Report shall include "Past Event Comparison" bar chart (8 events)      | High     |
| BAND-ANA-04 | Report shall include "New Traffic Rate" donut/pie chart                | High     |
| BAND-ANA-05 | Traffic chart shall show initial vs. increased attendance percentages  | Medium   |

---

### 3.4 Shared/Navigation Features

#### 3.4.1 Bottom Navigation

| ID     | Requirement                                                                      | Priority |
| ------ | -------------------------------------------------------------------------------- | -------- |
| NAV-01 | App shall display role-aware bottom navigation bar                               | High     |
| NAV-02 | Navigation shall have four tabs: Home, Calendar, Messages/Notifications, Profile | High     |
| NAV-03 | Icons shall dynamically change based on user role                                | High     |
| NAV-04 | Home tab: Map (fans) / Dashboard (bands)                                         | High     |
| NAV-05 | Calendar tab: My Events (fans) / Shows & Availability (bands)                    | High     |
| NAV-06 | Messages tab: Notifications (fans) / Inbox (bands)                               | High     |
| NAV-07 | Profile tab: User profile (fans) / Band profile (bands)                          | High     |

---

## 4. Data Requirements

### 4.1 Data Entities

| Entity       | Required Fields                                                                      |
| ------------ | ------------------------------------------------------------------------------------ |
| Venue        | id, name, address, city, capacity, coordinates (lat/lng), images                     |
| Band         | id, name, genre, location, image, bio, social links                                  |
| Event        | id, title, bandId, venueId, dateTime, image, rsvpCount, capacity, price, description |
| User         | id, role, name, location, avatar, topGenres, memberSince                             |
| Message      | id, conversationId, senderId, content, timestamp, read                               |
| Notification | id, userId, type, content, timestamp, read                                           |

### 4.2 State Management

| ID      | Requirement                                                | Priority |
| ------- | ---------------------------------------------------------- | -------- |
| DATA-01 | Liked events shall persist in localStorage via custom hook | High     |
| DATA-02 | RSVP events shall persist in localStorage via custom hook  | High     |
| DATA-03 | User role shall persist in localStorage                    | High     |
| DATA-04 | Auth state shall persist in localStorage                   | High     |
| DATA-05 | Master event list shall be accessible via shared hook      | High     |

---

## 5. Technical Requirements

### 5.1 Framework & Stack

| Component        | Technology                                      |
| ---------------- | ----------------------------------------------- |
| Framework        | Next.js (App Router)                            |
| Styling          | Tailwind CSS with shadcn/ui components          |
| State Management | React hooks with localStorage persistence       |
| Routing          | File-based routing with dynamic `[id]` segments |

### 5.2 UI/UX Requirements

| ID    | Requirement                                                            | Priority |
| ----- | ---------------------------------------------------------------------- | -------- |
| UI-01 | Application shall use mobile-first responsive design                   | High     |
| UI-02 | Application shall support dark mode                                    | Medium   |
| UI-03 | Onboarding shall feature immersive video background                    | Medium   |
| UI-04 | All interactive elements shall have appropriate tap targets for mobile | High     |
| UI-05 | Carousels shall be horizontally scrollable                             | High     |
| UI-06 | Modal-based filtering shall be used for search refinement              | Medium   |

### 5.3 Performance Requirements

| ID      | Requirement                                             | Priority |
| ------- | ------------------------------------------------------- | -------- |
| PERF-01 | Map shall load with visible event pins within 2 seconds | High     |
| PERF-02 | Page transitions shall feel instantaneous (<300ms)      | Medium   |
| PERF-03 | Images shall be optimized for mobile bandwidth          | Medium   |

---

## 6. User Flows

### 6.1 Fan Discovery Flow

```
1. Open app
   ↓
2. Map view loads with nearby events
   ↓
3. (Optional) Filter by genre or search
   ↓
4. Tap map pin or event card
   ↓
5. View event details page
   ↓
6. Like (save) or RSVP to event
   ↓
7. Event appears in Calendar view
```

### 6.2 Band Booking Flow

```
1. View dashboard stats and opportunities
   ↓
2. Browse suggested venues or open dates
   ↓
3. Tap "Apply" on opportunity
   ↓
4. Coordinate via Messages with venue
   ↓
5. Booking confirmed → appears in Calendar
   ↓
6. Post-show → Track via Analytics Report
```

---

## 7. Route Structure

| Route       | Component                   | Description                            |
| ----------- | --------------------------- | -------------------------------------- |
| `/`         | OnboardingFlow              | Role selection and authentication      |
| `/home`     | MapView / BandHome          | Fan map or Band dashboard (role-based) |
| `/calendar` | CalendarView / BandCalendar | Events list (role-based)               |
| `/messages` | MessagesView / BandMessages | Notifications or Inbox (role-based)    |
| `/profile`  | ProfileView / BandProfile   | User or Band profile (role-based)      |
| `/gig/[id]` | EventDetails                | Individual event detail page           |

---

## 8. Component Inventory

### 8.1 Shared Components

- `BottomNav` — Role-aware navigation bar
- `EventCard` — Reusable event display card

### 8.2 Fan Components

- `OnboardingFlow` — Role selection UI
- `AuthPage` — Authentication form
- `MapView` — Map-based discovery home
- `CustomInteractiveMap` — Map rendering
- `SearchBar` — Search input with filters
- `CalendarView` — My Events display
- `MessagesView` — Notifications list
- `ProfileView` — Fan profile

### 8.3 Band Components

- `BandHome` — Dashboard with stats
- `BandCalendar` — Shows & availability
- `BandMessages` — Venue inbox
- `BandProfile` — Band info & analytics
- `AnalyticsReport` — Performance charts

### 8.4 Custom Hooks

- `use-liked-events` — Manage liked/saved events
- `use-rsvp-events` — Manage RSVP state
- `use-shared-events` — Provide master event list

---

## 9. Genre Options

The following genres shall be available for filtering:

1. Indie
2. Rock
3. Jazz
4. Electronic
5. Folk
6. Pop
7. Alternative

---

## 10. Future Considerations (Post-MVP)

| Feature               | Description                        |
| --------------------- | ---------------------------------- |
| Push Notifications    | Native push for event reminders    |
| Ticketing Integration | In-app ticket purchase             |
| Social Features       | Fan-to-fan connections             |
| Venue Dashboard       | Third user role for venue managers |
| Expanded Geography    | Markets beyond Bay Area            |
| Payment Processing    | In-app payments for ticket sales   |
| Artist Following      | Follow system with activity feeds  |
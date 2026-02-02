# Changelog

All notable changes to the Ear-Plug project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive project documentation (README, CONTRIBUTING, CHANGELOG, CODE_OF_CONDUCT, SECURITY)

## [0.1.0] - 2024-01-29

### Added
- Initial project structure with Turborepo monorepo setup
- Next.js 14 web application with App Router
- Expo 51 mobile application with Expo Router
- Convex backend with 13-table database schema
- Clerk authentication integration for web and mobile
- Google Maps integration for event discovery
- Shared package with types, validation schemas, and utilities
- Tailwind CSS design system with brutalist dark theme

### Features

#### Fan Experience
- Map-based event discovery with Google Maps
- Genre filtering (Indie, Rock, Jazz, Electronic, Folk, Pop, Alternative)
- Distance radius filtering (1, 5, 10, 25, 50 miles)
- Event RSVP functionality
- Event likes/saves
- Calendar view of upcoming RSVPs and liked events
- Artist following with notifications
- Venue saving with notifications
- User profile management

#### Musician Experience
- Band dashboard with performance metrics
- Show calendar with status tracking
- Event creation with venue search via Google Places
- Open dates browser for booking opportunities
- Application system for open dates
- Venue messaging system
- Band profile management with multi-genre support
- Analytics with Recharts visualizations

#### Backend
- User management linked to Clerk authentication
- Band profiles with multi-genre support
- Venue data with geolocation coordinates
- Event management with status tracking
- Real-time RSVP and like counts
- Conversation-based messaging between bands and venues
- Notification system for event reminders and updates
- Open dates and application workflow
- Database seeding with Bay Area sample data

### Technical Highlights
- Role-based UI rendering (fan vs musician)
- Protected routes via Clerk middleware
- Real-time data subscriptions with Convex
- Custom React hooks wrapping Convex queries/mutations
- Haversine distance calculations for geospatial queries
- Coordinate matching for venue deduplication

### Changed
- Display "Completed" status for past events
- Refactored EventCard to horizontal layout
- Extracted geo-spatial utility functions to dedicated module
- Improved venue coordinate matching logic

### Fixed
- Ensured `isCreatingUser` flag always resets in finally block
- Disabled secrets scanning for public env vars in build output
- Fixed Netlify build by skipping postinstall scripts for React Native deps
- Resolved Clerk middleware API compatibility issues

### Infrastructure
- Turborepo configuration for parallel task execution
- pnpm workspace setup
- TypeScript strict mode across all packages
- ESLint configuration
- Tailwind CSS with shared design tokens
- Git workflow with .gitignore for env files and build artifacts

---

## Version History

### Commit History (Recent)

- `c2ddde3` - Remove all `react-best-practices` rules and add CONTRIBUTING.md
- `e9d1d9f` - refactor: Extract geo-spatial utility functions to new module
- `905b847` - feat: Add coderefactor.md, refine Next.js image domains
- `e9b6709` - style: Add Clerk component styling overrides, improve iOS input zoom fix
- `894420f` - fix: Ensure isCreatingUser flag always resets in finally block
- `060d2df` - fix: Disable secrets scanning for public env vars
- `3fb03cc` - fix: Netlify build - skip postinstall scripts, fix Clerk middleware API
- `7cf0022` - build: Configure Netlify to ignore postinstall scripts
- `c9750af` - Fix Netlify: use custom install command with --ignore-scripts
- `66275f6` - Fix Netlify build: skip postinstall scripts for React Native deps
- `1c75da0` - feat: Expand and refine .gitignore patterns
- `9374fbe` - feat: Display "Completed" status for past events, refactor EventCard
- `30a8272` - Initial commit
- `e72d601` - feat: Introduce CityAutocomplete component for location input
- `f53e6de` - feat: Implement brutalist dark mode theme, map components, gig creation modal
- `2928bb8` - feat: Implement multi-genre support for bands, integrate analytics
- `6204d44` - feat: Redesign fan event calendar, add genre filtering to map view
- `6f81666` - First commit

---

## Release Notes Template

When creating a new release, copy this template:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes to existing functionality

### Deprecated
- Features that will be removed in future versions

### Removed
- Features that were removed

### Fixed
- Bug fixes

### Security
- Security-related changes
```

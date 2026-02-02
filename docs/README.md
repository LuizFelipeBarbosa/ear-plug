# Ear-Plug Documentation

Welcome to the Ear-Plug documentation. This guide covers everything you need to know about developing, deploying, and contributing to the Ear-Plug platform.

## Quick Links

### Product & Design
- [Product Requirements (PRD)](./PRD.md) - Complete MVP requirements document
- [Design Specifications](./design/DESIGN_SPECIFICATIONS.md) - UI/UX design specifications
- [Tech Stack](./architecture/tech-stack.md) - Technology choices and rationale

### Getting Started
- [Installation Guide](./getting-started/installation.md) - Set up your development environment
- [Environment Variables](./getting-started/environment-variables.md) - Configure required secrets and API keys

### Architecture
- [System Overview](./architecture/overview.md) - High-level architecture and design decisions
- [Data Flow](./architecture/data-flow.md) - Request lifecycle and state management
- [Authentication](./architecture/authentication.md) - Clerk integration and auth flow

### API Reference
- [Convex Backend](./api/convex/) - Database queries and mutations
  - [Users API](./api/convex/users.md)
  - [Events API](./api/convex/events.md)
  - [Bands API](./api/convex/bands.md)
  - [Venues API](./api/convex/venues.md)
  - [Messages API](./api/convex/messages.md)
  - [Notifications API](./api/convex/notifications.md)
- [React Hooks](./api/hooks/README.md) - Custom hooks for data fetching

### Database
- [Schema Reference](./database/schema.md) - All 13 tables and their fields
- [Entity Relationships](./database/entities.md) - How data connects

### Integrations
- [Clerk Authentication](./integrations/clerk.md)
- [Convex Backend](./integrations/convex.md)
- [Google Maps](./integrations/google-maps.md)

### Guides
- [Role-Based UI](./guides/role-based-ui.md) - Fan vs Musician patterns
- [Geospatial Features](./guides/geospatial.md) - Location-based queries

### Deployment
- [Web (Vercel)](./deployment/web-vercel.md)
- [Mobile (EAS)](./deployment/mobile-eas.md)
- [Convex Production](./deployment/convex-production.md)

### Discovery
- [Project Analysis](./\_discovery/project-analysis.md) - Codebase overview
- [Architecture Map](./\_discovery/architecture-map.md) - Component relationships
- [API Catalog](./\_discovery/api-catalog.md) - Complete API reference

## Project Overview

Ear-Plug is a "Listen Local" platform connecting Bay Area live music fans with musicians and bands. It's built as a Turborepo monorepo with:

- **Web App**: Next.js 14 with App Router
- **Mobile App**: Expo 51 with Expo Router
- **Backend**: Convex serverless database and functions
- **Auth**: Clerk for authentication

## Key Metrics

| Metric           | Count             |
| ---------------- | ----------------- |
| Database Tables  | 13                |
| Convex Queries   | 28+               |
| Convex Mutations | 23+               |
| Custom Hooks     | 10                |
| Supported Genres | 7                 |
| User Roles       | 2 (Fan, Musician) |

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on how to contribute to this project.

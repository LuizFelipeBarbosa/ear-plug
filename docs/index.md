# Ear-Plug Documentation

Welcome to the Ear-Plug documentation - a "Listen Local" platform connecting Bay Area live music fans with musicians and bands.

## Quick Links

- [Getting Started](guides/getting-started.md) - Set up your development environment
- [API Reference](api/overview.md) - Convex queries and mutations
- [Architecture Overview](architecture/overview.md) - System design and patterns

---

## For Users

### Getting Started
- [Quick Start Guide](guides/getting-started.md) - 5-minute setup
- [Key Concepts](guides/concepts/user-roles.md) - Understand fans vs musicians

### Tutorials
- [Adding a Feature](guides/tutorials/adding-a-feature.md) - End-to-end feature development
- [Creating Convex Functions](guides/tutorials/creating-convex-functions.md) - Backend development
- [Working with Auth](guides/tutorials/working-with-auth.md) - Clerk + Convex authentication
- [Mobile Development](guides/tutorials/mobile-development.md) - Expo workflow

### How-To Guides
- [Add a New Page](guides/how-to/add-new-page.md) - Web and mobile routing
- [Add a Database Table](guides/how-to/add-database-table.md) - Convex schema changes
- [Troubleshooting](guides/how-to/troubleshooting.md) - Common issues and solutions

### Reference
- [Configuration](reference/configuration.md) - All config files explained
- [Glossary](reference/glossary.md) - Project terminology

---

## For Developers

### Architecture
- [Overview](architecture/overview.md) - High-level system design
- [Data Flow](architecture/data-flow.md) - Request lifecycle and state management
- [Database](architecture/database.md) - Schema, ER diagram, query patterns
- [Integrations](architecture/integrations.md) - Clerk, Convex, Google Maps

### Development
- [Setup](development/setup.md) - Complete environment setup
- [Building](development/building.md) - Turborepo pipeline and commands
- [Testing](development/testing.md) - Testing strategy and tools
- [Debugging](development/debugging.md) - Debug tools and common issues
- [Deployment](development/deployment.md) - Vercel, Expo, Convex deployment

### API Documentation
- [Overview](api/overview.md) - API introduction and patterns
- [Authentication](api/authentication.md) - Clerk + Convex JWT flow
- [Webhooks](api/webhooks.md) - Clerk webhook handler
- **Endpoints:**
  - [Users](api/endpoints/users.md)
  - [Bands](api/endpoints/bands.md)
  - [Venues](api/endpoints/venues.md)
  - [Events](api/endpoints/events.md)
  - [Messages](api/endpoints/messages.md)
  - [Notifications](api/endpoints/notifications.md)

---

## For Contributors

### Getting Involved
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute
- [Code of Conduct](../CODE_OF_CONDUCT.md) - Community guidelines
- [Security Policy](../SECURITY.md) - Reporting vulnerabilities

### Code Examples
- [Quick Start Examples](examples/quick-start/) - Minimal working examples
- [Common Use Cases](examples/common-use-cases/) - Complete feature examples
- [Code Snippets](examples/code-snippets/typescript/) - Reusable patterns
- [Hooks Usage](examples/hooks-usage/) - React hook examples

### Diagrams
- [System Overview](diagrams/system-overview.mermaid)
- [Component Diagram](diagrams/component-diagram.mermaid)
- [Entity Relationship](diagrams/entity-relationship.mermaid)
- [Deployment](diagrams/deployment.mermaid)
- [Sequence Diagrams](diagrams/sequence-diagrams/) - User flows
- [State Diagrams](diagrams/state-diagrams/) - Status transitions

---

## Discovery Documents

Internal documentation generated during codebase analysis:

- [Architecture Map](_discovery/architecture-map.md)
- [API Catalog](_discovery/api-catalog.md)
- [Interface Catalog](_discovery/interface-catalog.md)
- [Environment Variables](_discovery/environment-variables.md)
- [System Requirements](_discovery/system-requirements.md)
- [Conventions](_discovery/conventions.md)
- [Business Logic Notes](_discovery/business-logic-notes.md)

---

## Additional Resources

- [Product Requirements (PRD)](PRD.md) - Original product specification
- [Design Specifications](design/DESIGN_SPECIFICATIONS.md) - UI/UX design system
- [Changelog](../CHANGELOG.md) - Version history

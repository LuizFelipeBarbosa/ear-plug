# System Requirements

This document lists all tools, versions, and external services needed to develop and deploy the Ear-Plug application.

---

## Runtime Requirements

### Node.js

| Requirement | Version | Source |
|-------------|---------|--------|
| Node.js | >= 20 | `package.json` engines field |
| Specified in `.nvmrc` | 20 | `.nvmrc` file |

**Installation**: Use nvm (Node Version Manager) for version management:
```bash
nvm install 20
nvm use 20
```

### Package Manager

| Tool | Version | Purpose |
|------|---------|---------|
| pnpm | 9.0.0 | Primary package manager (specified in `packageManager` field) |

**Installation**:
```bash
npm install -g pnpm@9
# or
corepack enable
corepack prepare pnpm@9.0.0 --activate
```

---

## Development Tools

### Turborepo

| Tool | Version | Purpose |
|------|---------|---------|
| turbo | ^2.3.0 | Monorepo build system and task runner |

Turbo is installed as a devDependency and provides:
- Parallel task execution
- Build caching
- Task dependency management

### TypeScript

| Tool | Version | Purpose |
|------|---------|---------|
| typescript | ^5.3.3 | Type checking across all packages |

TypeScript configuration:
- Base config: `tsconfig.base.json` (ES2022 target)
- Apps extend base config with app-specific settings

---

## Build Commands

### Root Level Commands

Run from the project root (`/`):

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all dev servers (web + mobile + convex) via Turbo |
| `pnpm dev:web` | Start web app only at localhost:3000 |
| `pnpm dev:mobile` | Start Expo mobile app only |
| `pnpm dev:convex` | Start Convex backend (`convex dev`) |
| `pnpm build` | Build all apps |
| `pnpm build:web` | Build web app only |
| `pnpm lint` | Run ESLint across all packages |
| `pnpm typecheck` | Run TypeScript checks across all packages |
| `pnpm clean` | Clean all Turbo caches and node_modules |

### Web App Commands (`apps/web/`)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js dev server (binds to 0.0.0.0) |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run Next.js linting |
| `pnpm typecheck` | Run TypeScript checks |

### Mobile App Commands (`apps/mobile/`)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Expo dev server |
| `pnpm ios` | Start iOS simulator |
| `pnpm android` | Start Android emulator |
| `pnpm web` | Start Expo web version |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript checks |

### Convex Commands

| Command | Description |
|---------|-------------|
| `npx convex dev` | Local development + type generation |
| `npx convex deploy` | Production deployment |
| `npx convex run seed:seedDatabase` | Seed sample data |
| `npx convex run seed:clearDatabase` | Clear seed data |

---

## External Services

### Clerk (Authentication)

| Service | Purpose | Required |
|---------|---------|----------|
| Clerk | User authentication, SSO, session management | Yes |

**Setup Requirements**:
1. Create Clerk application
2. Configure JWT template for Convex
3. Set up OAuth providers (optional: Google, Apple, etc.)

**Dashboard**: https://dashboard.clerk.com

### Convex (Backend)

| Service | Purpose | Required |
|---------|---------|----------|
| Convex | Serverless database, real-time subscriptions, backend functions | Yes |

**Features Used**:
- Real-time queries
- Mutations
- Server-side functions
- Database indexes

**Dashboard**: https://dashboard.convex.dev

### Google Maps Platform

| Service | Purpose | Required |
|---------|---------|----------|
| Maps JavaScript API | Web map display | Optional (for map features) |
| Places API | Location autocomplete | Optional (for location search) |
| Maps SDK for iOS | Native iOS maps | Optional (for mobile maps) |
| Maps SDK for Android | Native Android maps | Optional (for mobile maps) |

**Setup Requirements**:
1. Create Google Cloud project
2. Enable required APIs
3. Create API keys with restrictions

**Console**: https://console.cloud.google.com

---

## Mobile Development Requirements

### iOS Development

| Requirement | Purpose |
|-------------|---------|
| macOS | Required for iOS development |
| Xcode | iOS simulator and build tools |
| iOS Simulator | Testing on virtual devices |
| CocoaPods | iOS dependency management (via Expo) |

### Android Development

| Requirement | Purpose |
|-------------|---------|
| Android Studio | Android SDK and emulator |
| Android Emulator | Testing on virtual devices |
| JDK 11+ | Java runtime for Android builds |

### Expo CLI

Expo CLI is installed via dependencies but can also be used globally:
```bash
npm install -g expo-cli
```

---

## Framework Versions

### Web Application

| Package | Version | Purpose |
|---------|---------|---------|
| next | 14.2.0 | React framework (App Router) |
| react | ^18.2.0 | UI library |
| react-dom | ^18.2.0 | React DOM rendering |
| @clerk/nextjs | ^5.0.0 | Clerk Next.js integration |
| convex | ^1.16.0 | Convex React client |
| @vis.gl/react-google-maps | ^1.0.0 | Google Maps React bindings |
| tailwindcss | ^3.4.0 | CSS framework |

### Mobile Application

| Package | Version | Purpose |
|---------|---------|---------|
| expo | ~51.0.0 | Mobile development platform |
| expo-router | ~3.5.0 | File-based routing |
| react-native | 0.74.0 | React Native framework |
| @clerk/clerk-expo | ^2.0.0 | Clerk Expo integration |
| convex | ^1.16.0 | Convex React client |
| nativewind | ^4.0.0 | TailwindCSS for React Native |
| react-native-maps | 1.14.0 | Native maps component |
| react-native-reanimated | ~3.10.0 | Animations library |

### Shared Packages

| Package | Version | Purpose |
|---------|---------|---------|
| zod | ^3.23.0 | Schema validation |

---

## Turbo Pipeline Configuration

From `turbo.json`:

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {},
    "clean": {
      "cache": false
    }
  }
}
```

**Task Descriptions**:
- `build`: Depends on all package builds (`^build`), caches `.next` and `dist` outputs
- `dev`: Not cached, runs persistently
- `lint`: Standard caching
- `typecheck`: Standard caching
- `clean`: Not cached

---

## Workspace Structure

From `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Packages**:
- `apps/web` - Next.js web application (`@ear-plug/web`)
- `apps/mobile` - Expo mobile application (`@ear-plug/mobile`)
- `packages/shared` - Shared types, validation, constants (`@ear-plug/shared`)
- `packages/tailwind-config` - Shared Tailwind configuration (`@ear-plug/tailwind-config`)

---

## Deployment Requirements

### Web Deployment (Vercel/Similar)

1. Node.js 20+ runtime
2. Environment variables configured
3. Build command: `pnpm build:web`
4. Output directory: `apps/web/.next`

### Mobile Deployment (Expo/EAS)

1. Expo account with EAS Build access
2. `eas.json` configuration (not currently in repo)
3. App signing credentials (iOS certificates, Android keystore)
4. Environment variables in EAS secrets

### Convex Deployment

1. Convex project linked to repository
2. `npx convex deploy` for production pushes
3. Authentication configured in Convex dashboard

---

## Development Environment Setup

### Quick Start

```bash
# 1. Clone repository
git clone <repo-url>
cd ear-plug

# 2. Use correct Node version
nvm use 20  # or: nvm install 20

# 3. Install dependencies
pnpm install

# 4. Set up environment files
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env.local
# Edit .env.local files with your values

# 5. Start Convex (generates types)
npx convex dev

# 6. In another terminal, start development
pnpm dev
```

### IDE Recommendations

- **VS Code** with extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript and JavaScript Language Features
  - Expo Tools

---

## Database Schema

Convex database with 13 tables:

| Table | Purpose |
|-------|---------|
| `users` | Clerk-linked user profiles (fan/musician roles) |
| `bands` | Musician band profiles with multi-genre support |
| `venues` | Bay Area venues with geolocation |
| `events` | Shows with status tracking |
| `rsvps` | User RSVPs to events |
| `likes` | User likes on events |
| `savedArtists` | User saved/followed artists |
| `savedVenues` | User saved venues |
| `conversations` | Band-venue messaging threads |
| `messages` | Individual messages in conversations |
| `notifications` | User notifications |
| `openDates` | Venue booking opportunities |
| `applications` | Band applications to open dates |

**Supported Genres**: indie, rock, jazz, electronic, folk, pop, alternative

---

## Troubleshooting

### Common Issues

1. **Convex types not generating**
   - Run `npx convex dev` to regenerate `convex/_generated/`

2. **Shared package changes not reflecting**
   - Restart dev server or run `pnpm build` in shared package

3. **Auth redirect loops**
   - Check Clerk middleware matcher in `apps/web/middleware.ts`

4. **Module resolution errors**
   - Ensure `pnpm install` was run from root
   - Check that workspace packages are linked correctly

5. **Mobile build failures**
   - Clear Metro cache: `npx expo start --clear`
   - Verify native dependencies are installed

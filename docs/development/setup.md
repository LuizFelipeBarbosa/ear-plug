# Development Environment Setup

This guide walks through setting up a complete development environment for the Ear-Plug project.

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | >= 20 | JavaScript runtime |
| pnpm | 9.0.0 | Package manager |
| Git | Latest | Version control |

### Optional Software

| Software | Purpose |
|----------|---------|
| VS Code | Recommended IDE |
| Xcode | iOS development (macOS only) |
| Android Studio | Android development |

## Quick Start

```bash
# 1. Clone the repository
git clone <repository-url>
cd ear-plug

# 2. Use correct Node version
nvm use 20
# or install if not available:
nvm install 20

# 3. Install pnpm if not installed
npm install -g pnpm@9

# 4. Install dependencies
pnpm install

# 5. Set up environment files
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env.local

# 6. Configure environment variables (see below)

# 7. Start Convex development server (generates types)
npx convex dev

# 8. In another terminal, start all apps
pnpm dev
```

## Node.js Setup

### Using nvm (Recommended)

```bash
# Install nvm (if not installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal, then install Node 20
nvm install 20

# The project includes .nvmrc, so you can use:
nvm use
```

### Verify Installation

```bash
node --version  # Should show v20.x.x
pnpm --version  # Should show 9.x.x
```

## Environment Configuration

### Web Application (`apps/web/.env.local`)

```env
# Convex - Get from https://dashboard.convex.dev
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

# Clerk - Get from https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev

# Google Maps (optional) - Get from https://console.cloud.google.com
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
```

### Mobile Application (`apps/mobile/.env.local`)

```env
# Convex
EXPO_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

# Clerk
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

# Google Maps (optional)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
```

### Obtaining API Keys

#### Convex

1. Go to https://dashboard.convex.dev
2. Create a new project or select existing
3. Copy the Deployment URL
4. Run `npx convex dev` to link local project

#### Clerk

1. Go to https://dashboard.clerk.com
2. Create a new application
3. Copy Publishable Key and Secret Key from API Keys page
4. Copy JWT Issuer Domain from JWT Templates

#### Google Maps (Optional)

1. Go to https://console.cloud.google.com
2. Create a new project
3. Enable Maps JavaScript API and Places API
4. Create an API key
5. (Recommended) Restrict key to your domains

## VS Code Configuration

### Recommended Extensions

Create or update `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "expo.vscode-expo-tools",
    "convex.convex"
  ]
}
```

### Workspace Settings

Create or update `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ],
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### Launch Configurations

Create or update `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "pnpm dev:web"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    },
    {
      "name": "Next.js: debug full stack",
      "type": "node-terminal",
      "request": "launch",
      "command": "pnpm dev:web",
      "serverReadyAction": {
        "pattern": "started server on .+, url: (https?://.+)",
        "uriFormat": "%s",
        "action": "debugWithChrome"
      }
    }
  ]
}
```

## Running the Development Servers

### All Applications

```bash
# From project root
pnpm dev
```

This starts:
- Web app at http://localhost:3000
- Mobile Expo server
- Convex dev server

### Individual Applications

```bash
# Web only
pnpm dev:web

# Mobile only
pnpm dev:mobile

# Convex only
pnpm dev:convex
# or
npx convex dev
```

### Convex Dashboard

While `npx convex dev` is running, access the dashboard at:
https://dashboard.convex.dev

## Mobile Development Setup

### iOS Development (macOS only)

1. Install Xcode from the App Store
2. Install Xcode Command Line Tools:
   ```bash
   xcode-select --install
   ```
3. Open Xcode and accept the license agreement
4. Install iOS Simulator

#### Running on iOS Simulator

```bash
# From apps/mobile
pnpm ios

# Or with specific simulator
npx expo run:ios --simulator "iPhone 15 Pro"
```

### Android Development

1. Download and install [Android Studio](https://developer.android.com/studio)
2. Install Android SDK (via Android Studio SDK Manager):
   - Android SDK Platform 34
   - Android SDK Build-Tools 34
   - Android Emulator
   - Android SDK Platform-Tools
3. Create an Android Virtual Device (AVD)

#### Environment Variables (add to `~/.zshrc` or `~/.bashrc`)

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

#### Running on Android Emulator

```bash
# Start the emulator first
emulator -avd <avd_name>

# Then run the app
pnpm android
```

### Expo Go (Fastest for Development)

For rapid development without native builds:

1. Install Expo Go on your physical device
2. Run `pnpm dev:mobile`
3. Scan the QR code with your device

## Project Structure Reference

```
ear-plug/
├── apps/
│   ├── web/                    # Next.js web application
│   │   ├── src/
│   │   │   ├── app/           # App Router pages
│   │   │   ├── components/    # React components
│   │   │   ├── hooks/         # Custom hooks
│   │   │   └── lib/           # Utilities
│   │   ├── .env.local         # Environment variables (create this)
│   │   └── package.json
│   │
│   └── mobile/                # Expo mobile application
│       ├── app/               # Expo Router pages
│       ├── .env.local         # Environment variables (create this)
│       └── package.json
│
├── convex/                    # Convex backend
│   ├── _generated/            # Auto-generated (don't edit)
│   ├── schema.ts              # Database schema
│   └── *.ts                   # Backend functions
│
├── packages/
│   ├── shared/               # Shared code
│   └── tailwind-config/      # Design system
│
├── .nvmrc                    # Node version
├── package.json              # Root workspace
├── pnpm-workspace.yaml       # Workspace config
└── turbo.json                # Turborepo config
```

## Common Setup Issues

### 1. pnpm Not Found

```bash
# Install pnpm globally
npm install -g pnpm@9

# Or use corepack
corepack enable
corepack prepare pnpm@9.0.0 --activate
```

### 2. Convex Types Not Generating

```bash
# Ensure Convex dev server is running
npx convex dev

# If still failing, clear and restart
rm -rf convex/_generated
npx convex dev
```

### 3. Module Resolution Errors

```bash
# Clean install all dependencies
pnpm clean
pnpm install
```

### 4. Environment Variables Not Loading

- Ensure files are named `.env.local` (not `.env`)
- Restart the development server after changes
- Verify variables have correct prefixes (`NEXT_PUBLIC_*` or `EXPO_PUBLIC_*`)

### 5. Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 pnpm dev:web
```

### 6. Mobile Build Failing

```bash
# Clear Metro bundler cache
cd apps/mobile
npx expo start --clear

# For native build issues
npx expo prebuild --clean
```

### 7. Tailwind Classes Not Working

1. Ensure the file is in the `content` array of `tailwind.config.js`
2. Restart the dev server
3. Check that NativeWind is properly configured for mobile

## Verifying Setup

### Check Web App

1. Navigate to http://localhost:3000
2. You should see the landing page
3. Authentication should work (Clerk integration)

### Check Mobile App

1. Start mobile server: `pnpm dev:mobile`
2. Scan QR code with Expo Go
3. App should load with authentication

### Check Convex Connection

1. Open browser console on web app
2. Should see no Convex connection errors
3. Data should load from queries

### Check Type Generation

```bash
# Verify TypeScript compiles
pnpm typecheck

# Should complete with no errors
```

## Next Steps

After setup is complete:

1. Review [Building Guide](./building.md) for build processes
2. Review [Testing Guide](./testing.md) for testing procedures
3. Review [Debugging Guide](./debugging.md) for troubleshooting
4. Review [Architecture Overview](../architecture/overview.md) for system understanding

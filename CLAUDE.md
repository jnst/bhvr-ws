# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Development (runs all in parallel)
```bash
bun run dev           # Runs shared types in watch mode, server, and client
bun run dev:client    # Vite dev server for React frontend
bun run dev:server    # Hono backend with watch mode
bun run dev:shared    # TypeScript compiler in watch mode for shared types
```

### Building
```bash
bun run build         # Builds shared, server, then client
bun run build:client  # Builds React frontend with Vite
bun run build:server  # Compiles TypeScript server
bun run build:shared  # Compiles shared types package
```

### Linting
```bash
cd client && bun run lint  # ESLint for React frontend
```

## Architecture Overview

### Monorepo Structure
- **client/**: React frontend using Vite, TailwindCSS, and shadcn/ui components
- **server/**: Hono backend API running on Bun runtime
- **shared/**: Common TypeScript type definitions and utilities

### Type Sharing System
The shared package must be built before use in client/server:
- Types are exported from `shared/src/index.ts`
- Import as `import { TypeName } from 'shared'` (not 'shared/dist')
- Changes to shared types require rebuilding: `bun run build:shared`

### Path Aliases
Root tsconfig.json defines path aliases:
- `@client/*` → `./client/src/*`
- `@server/*` → `./server/src/*`
- `@shared/*` → `./shared/src/*`

Vite config includes additional aliases:
- `@/*` → `./client/src/*`

### Package Dependencies
- Workspaces use `workspace:*` for cross-package dependencies
- Client imports both `shared` and `server` packages
- Server imports `shared` package

### Technology Stack
- **Runtime**: Bun (JavaScript runtime and package manager)
- **Backend**: Hono (web framework) with CORS enabled
- **Frontend**: React 19 + Vite + TailwindCSS
- **Styling**: shadcn/ui components with Radix UI primitives
- **Type Safety**: Full TypeScript coverage across all packages

### Environment Configuration
- Client uses `VITE_SERVER_URL` environment variable (defaults to http://localhost:3000)
- Server runs on port 3000 by default

## Development Workflow

1. Always run `bun install` after pulling changes
2. Start development with `bun run dev` (runs all packages in parallel)
3. When modifying shared types, other packages auto-rebuild in dev mode
4. For production builds, shared types are built first, then server, then client

## Current Project Status

This is a bhvr.dev starter template that has been initialized for building a realtime voting service MVP. The base template includes:
- Basic API endpoint (`/hello`) demonstrating type-safe communication
- Example React component showing API consumption
- Shared `ApiResponse` type definition

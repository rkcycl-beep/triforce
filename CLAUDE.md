# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is this project?
TriForce is a multi-tenant team sports challenge platform for endurance athletes.
Coaches create challenges, athletes connect Garmin/Strava, the platform tracks progress and shows leaderboards.

## Quick Start
Read these files FIRST at the start of every session:
1. **TODO.md** — see "Current Focus" section for what to work on next
2. **PLAN.md** — full architecture, database schema, API routes, scoring system

## Commands
```bash
npm run dev      # Start dev server on localhost:3000
npm run build    # Production build (runs type-check + compile)
npm run lint     # ESLint check (no --fix flag; fix manually)
# No test runner configured yet

# Database (Prisma 5 + Neon)
npx prisma db push          # Push schema changes to Neon (dev, no migration files)
npx prisma migrate deploy   # Apply migration files (production/CI)
npx prisma studio           # Browse DB tables in browser UI
npx prisma generate         # Regenerate client after schema change (also runs via postinstall)
```

## Key Facts
- **Owner**: Robbie, beginner developer in Yavne, Israel — explain decisions simply
- **Language**: Hebrew RTL is primary, English is secondary
- **Framework**: Next.js 16 (App Router) — uses `proxy.ts` not `middleware.ts`
- **Auth**: NextAuth v4 with Strava OAuth (working) + Credentials (coming)
- **Database**: Neon PostgreSQL (eu-central-1) + Prisma 5 ORM — schema created, tables live
- **Styling**: Tailwind CSS, mobile-first
- **Starting users**: ~40 athletes, 1 coaching group

## Current State vs Planned

**Working now (POC):** Strava OAuth login with auto token refresh, activity fetching via live Strava API calls (no DB), dashboard with stats/chart/activity list, activity detail with Leaflet route map, mobile Shell layout with bottom nav, TanStack Query caching.

**Not yet built:** Groups/roles, challenges, scoring, webhooks, Hebrew RTL, coach UI. See PLAN.md for the full roadmap.

**Current API routes** (live Strava proxy — will be replaced in Phase 1A):
- `/api/strava/activities` — list activities
- `/api/strava/activities/[id]` — single activity
- `/api/strava/athlete` — athlete profile
- `/api/strava/stats` — aggregate stats

## Architecture Decisions
- **Single User table** with role (COACH/ATHLETE) — no separate auth systems
- **GroupMembership** for multi-tenant isolation — every query scoped by groupId
- **Service layer** (`src/services/`) — business logic lives here, not in API routes
- **Incremental migration** — never break working Strava integration
- **JWT strategy** — tokens in JWT; Prisma adapter will persist users to DB when added

## Code Standards
- TypeScript strict — no `any` types
- Files under 150 lines — split if longer
- All components must work on mobile (375px) and tablet (768px+)
- `'use client'` directive on any component with useState/useEffect/browser APIs
- Error handling on every API route and data fetch
- Hebrew RTL: use Tailwind logical properties (`ps`/`pe`/`ms`/`me` not `pl`/`pr`/`ml`/`mr`)

## Important File Locations
- `src/lib/auth.ts` — NextAuth config (Strava OAuth + token refresh)
- `src/lib/strava.ts` — Strava API helper functions
- `src/lib/normalizers.ts` — converts Strava/Garmin data to unified Activity type
- `src/types/activity.ts` — unified Activity type definition
- `src/proxy.ts` — route protection; exports named `proxy` function + `config` (not a default export, not `middleware`)
- `src/providers/Providers.tsx` — SessionProvider + QueryClientProvider
- `.env.local` — secrets (never commit this)

## proxy.ts Convention
Next.js 16 uses `proxy.ts` instead of `middleware.ts`. The file must export a named `proxy` function and a `config` object — not a default export. Route protection currently redirects unauthenticated users from `/dashboard`, `/activities`, `/settings` to `/`. Future: add `/coach/*` protection when roles are implemented.

## Commit Message Style
Clear English, describe the "why" not the "what". Example:
"Add Prisma schema with multi-tenant group isolation"

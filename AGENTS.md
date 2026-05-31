<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# TriForce — Agent Context

## Project Overview

**TriForce** is a multi-tenant team sports challenge platform for endurance athletes.
- A **coach** creates challenges for their training group
- **Athletes** connect Strava — data syncs automatically
- The platform tracks progress, displays leaderboards, and awards prizes

**Primary language:** Hebrew (RTL). English as future option.
**Current users:** ~40 athletes in one coaching group in Israel.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16.2.1 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (mobile-first) |
| Database | PostgreSQL (Neon) + Prisma ORM v5 |
| Auth | NextAuth.js v4 (Strava OAuth + Credentials) |
| Maps | Leaflet.js |
| Charts | Recharts |
| Data Fetching | TanStack Query (React Query) |

## Key Conventions

### Route Protection
- File is `src/proxy.ts` (exports `proxy` + `config`) — **NOT** `middleware.ts`
- Cannot call `getToken()` in proxy.ts (causes "Router action dispatched before initialization")
- Role-based guards must use `getServerSession` in server-component layouts

### App Router Structure
```
src/app/
  (public)/          -- no auth required
    page.tsx         -- landing page (login gates)
    coach/sign-in/   -- coach login
    coach/sign-up/   -- coach registration
  (athlete)/         -- athlete views (bottom nav)
    dashboard/
    activities/
    challenges/
    settings/
  (coach)/           -- coach views (sidebar)
    coach/
    coach/groups/
  api/               -- API routes
```

### Hebrew / RTL
- UI text is in Hebrew
- `dir="rtl"` is set on `<html>` in root layout
- Use logical CSS properties: `ps-4` not `pl-4`, `me-2` not `mr-2`

## Important Files

| File | Purpose |
|------|---------|
| `src/lib/auth.ts` | NextAuth config (Strava + Credentials providers, JWT strategy) |
| `src/lib/prisma.ts` | Prisma client singleton |
| `src/proxy.ts` | Route protection (cookie-based) |
| `prisma/schema.prisma` | Database schema |
| `src/lib/scoring/index.ts` | Scoring engine dispatcher |
| `scripts/seed.ts` | DB seed script for demo data |

## After Git Pull

```bash
npm install
npx prisma generate
npm run dev
```

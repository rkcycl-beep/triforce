# TriForce — Production Platform Plan

## What Is TriForce

A multi-tenant team sports challenge platform for endurance athletes.
- A **coach** creates challenges for their training group
- **Athletes** connect Garmin/Strava — data syncs automatically
- The platform tracks progress, displays leaderboards, and awards prizes

Primary language: **Hebrew (RTL)**. English as future option.
Starting with ~40 athletes in one coaching group in Israel.

---

## Current State (POC — Complete)

- Next.js 16 + TypeScript + Tailwind CSS
- Strava OAuth working (NextAuth v4, JWT strategy)
- Activity data fetching from Strava API with auto token refresh
- Unified Activity type (multi-source ready)
- Dashboard with stats cards, weekly chart, activity list
- Activity detail page with route map (Leaflet.js)
- Mobile-first responsive layout
- NO database — everything is API-fetched + JWT-stored
- NO roles — single user type (athlete via Strava)
- LTR English only

---

## User Types

### Coach
- Creates and manages challenges
- Sends broadcast and personal messages
- Views all athlete progress
- Manages events and prizes
- Sets financial participation rules

### Athlete
- Connects Garmin and/or Strava (one-time, auto-sync after)
- Views active challenges and own progress
- Sees group leaderboard
- Receives messages and notifications
- Views personal training history

### Platform Admin (Phase 2)
- Manages multiple independent coaching groups (multi-tenant)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS (mobile-first) |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth.js v4 (Strava OAuth + Credentials) |
| Maps | Leaflet.js |
| Charts | Recharts |
| Data Fetching | TanStack Query (React Query) |
| Strava | OAuth + Webhooks |
| Garmin | OAuth + Webhooks (Phase 2, pending approval) |
| Hosting | Vercel (frontend) + Railway/Render (DB) |
| Hebrew Font | Heebo (Google Fonts) |

---

## Database Schema (PostgreSQL + Prisma)

### Core Models

**Group** — the tenant boundary
- id, name, slug (unique), inviteCode (6-char), timezone, locale
- Every group is completely isolated

**User** — both coaches and athletes
- id, name, email, image, role (COACH/ATHLETE)
- sex ("M"/"F"), dateOfBirth — for age-grade scoring

**GroupMembership** — many-to-many (user can be in multiple groups)
- userId, groupId, role (role within THIS group)
- @@unique([userId, groupId])

**ProviderAccount** — Strava, Garmin connections
- userId, provider ("strava"/"garmin"), providerAccountId
- accessToken, refreshToken, expiresAt
- @@unique([provider, providerAccountId])

**Activity** — persisted, deduplicated
- userId, groupId, provider, providerActivityId
- name, sportType, rawSportType, startDate
- distance (m), movingTime (s), elapsedTime (s), elevationGain (m)
- averageSpeed, maxSpeed, averageHeartrate, maxHeartrate
- mapPolyline, calories, isDuplicate, duplicateOfId
- @@unique([provider, providerActivityId, userId])
- @@index([userId, startDate])
- @@index([groupId, startDate])

**Challenge**
- groupId, name, description, sportTypes[]
- scoringMethod (AGE_GRADE / CATEGORY / PERSONAL_IMPROVEMENT)
- startDate, endDate, status (DRAFT/ACTIVE/COMPLETED/CANCELLED)
- config (JSON — scoring-method-specific params)

**ChallengeEntry** — athlete's participation + score
- challengeId, userId, score, rank, metadata (JSON)
- @@unique([challengeId, userId])

**ChallengeActivityLink** — which activities count toward a challenge
- challengeEntryId, activityId, pointsAwarded

**Message**
- groupId, userId, content, type (CHAT/ANNOUNCEMENT/SYSTEM)

**Event**
- groupId, createdById, name, description, location, eventDate

**Prize**
- challengeId, rank, description, imageUrl

**Payment** (Phase 2)
- groupId, userId, amount, currency, status, provider

### Enums
- Role: COACH, ATHLETE
- ScoringMethod: AGE_GRADE, CATEGORY, PERSONAL_IMPROVEMENT
- ChallengeStatus: DRAFT, ACTIVE, COMPLETED, CANCELLED
- MessageType: CHAT, ANNOUNCEMENT, SYSTEM
- PaymentStatus: PENDING, COMPLETED, FAILED, REFUNDED

### Multi-Tenant Isolation
Every data-access function requires `groupId`. All queries are scoped.
A service layer enforces this — no direct Prisma calls from routes.

---

## Scoring System

### Method 1: Age Grade Score
- Compares athlete's time against world record for their age/sex/distance
- Formula: `ageGradePercent = (referenceTime / actualTime) * 100`
- Uses WMA (World Masters Athletics) lookup tables (static JSON)
- Requires: athlete dateOfBirth + sex
- Activity matches if distance within +/- 10% of challenge distance

### Method 2: Category Groups
- Athletes grouped by age/sex categories (e.g., "Men 50-59")
- Coach defines categories in challenge config
- Ranked by chosen metric within each category
- Overall leaderboard + per-category sub-leaderboards

### Method 3: Personal Improvement
- Compares against own baseline (N weeks before challenge start)
- `improvementPercent = ((current - baseline) / baseline) * 100`
- Most motivating for beginners and older athletes
- Edge case: new athletes use week 1 as baseline, scoring from week 2

### Recommended: Combine Methods 2 + 3
Category leaderboard (fair) + "Most Improved" award (motivation)

### Scoring Engine Architecture
- Dispatcher pattern in `lib/scoring/index.ts`
- Separate modules: `age-grade.ts`, `category.ts`, `personal-improvement.ts`
- Recalculated when: new activity synced, coach edits challenge, nightly cron

---

## Activity Deduplication (Garmin + Strava)

When athlete has both connected, same workout appears from both sources.

### Matching Criteria (ALL must match):
- Same user
- Same normalized sport type
- startDate within +/- 60 seconds
- movingTime within +/- 120 seconds
- distance within +/- 5%

### Resolution:
- Insert both, flag duplicate with `isDuplicate = true`
- Primary source priority: Garmin > Strava (configurable per user)
- Only primary counts toward challenge scoring
- UI shows "Also recorded on [source]" badge

---

## RTL / Hebrew Support

### Layout
- `<html lang="he" dir="rtl">` — dynamic based on locale
- Tailwind logical properties: `ps-4` not `pl-4`, `me-2` not `mr-2`
- Flexbox auto-reverses in RTL — minimal changes needed
- Directional icons (arrows, chevrons) flip with `rtl:rotate-180`

### Font
- **Heebo** from Google Fonts (Hebrew + Latin)
- Loaded alongside existing Geist font

### Translation
- Lightweight: `i18n/he.json` + `i18n/en.json` key-value files
- `useTranslation()` hook reads locale from context
- No heavy i18n library for v1

### Formatting
- Dates: `he-IL` locale
- Distance: `ק"מ` instead of `km`
- Numbers: locale-aware formatting

---

## Auth Strategy

### Single login system with role-based routing
- One User table, roles via GroupMembership
- Coach might also be an athlete — two accounts is bad UX
- NextAuth JWT strategy + Prisma adapter (users persist to DB)
- Strava OAuth for athletes + Credentials (email/password) for coaches
- Athletes without Strava can use email login, connect devices in Settings

### Auth Flow
```
Athlete: Sign in -> Enter invite code -> Join group -> See challenges
Coach:   Sign in (email) -> Create group -> Create challenges -> Manage athletes
```

### Route Protection (proxy.ts)
- `/coach/*` — requires COACH role
- `/dashboard`, `/activities`, `/challenges` — requires auth (any role)
- `/`, `/join/*` — public

---

## API Routes

### Auth
- `POST/GET /api/auth/[...nextauth]` — NextAuth handlers

### Athlete Routes
- `GET/PATCH /api/athlete/profile` — own profile
- `GET /api/athlete/activities` — activities from DB (paginated)
- `GET /api/athlete/challenges` — active challenges
- `GET /api/athlete/challenges/[id]` — single challenge + leaderboard
- `GET /api/athlete/groups` — groups I belong to
- `POST /api/athlete/groups/join` — join via invite code

### Coach Routes
- `GET/POST /api/coach/groups` — manage groups
- `GET/DELETE /api/coach/groups/[groupId]/members` — manage members
- `GET/POST /api/coach/groups/[groupId]/challenges` — manage challenges
- `GET/PATCH/DELETE /api/coach/groups/[groupId]/challenges/[id]`
- `GET/POST /api/coach/groups/[groupId]/messages` — announcements
- `GET/POST /api/coach/groups/[groupId]/events` — events
- `GET /api/coach/groups/[groupId]/leaderboard` — aggregate view

### Webhooks
- `GET/POST /api/webhooks/strava` — Strava push events
- `POST /api/webhooks/garmin` — Garmin push (Phase 2)

---

## Folder Structure

```
src/
  app/
    (public)/                    -- no auth required
      page.tsx                   -- landing page
      join/[code]/page.tsx       -- group invite link
    (athlete)/                   -- athlete views
      dashboard/page.tsx
      activities/page.tsx
      activities/[id]/page.tsx
      challenges/page.tsx
      challenges/[id]/page.tsx
      profile/page.tsx
      settings/page.tsx
      layout.tsx                 -- athlete Shell (bottom nav)
    (coach)/                     -- coach views
      coach/page.tsx             -- coach dashboard
      coach/groups/[groupId]/page.tsx
      coach/groups/[groupId]/challenges/new/page.tsx
      coach/groups/[groupId]/challenges/[id]/page.tsx
      coach/groups/[groupId]/members/page.tsx
      coach/groups/[groupId]/messages/page.tsx
      coach/groups/[groupId]/events/page.tsx
      layout.tsx                 -- coach Shell (sidebar nav)
    api/
      auth/[...nextauth]/route.ts
      athlete/...
      coach/...
      webhooks/strava/route.ts
    layout.tsx                   -- root layout (RTL, fonts, providers)

  components/
    ui/                          -- Button, Card, Modal, Input, etc.
    layout/                      -- AthleteShell, CoachShell, Header, BottomNav, Sidebar
    athlete/                     -- ActivityCard, ChallengeCard, LeaderboardTable
    coach/                       -- ChallengeForm, MemberList, ScoringConfigPanel
    dashboard/                   -- StatsOverview, WeeklySummary, RecentActivities
    maps/                        -- RouteMap, RouteMapLazy

  lib/
    auth.ts                      -- NextAuth config
    prisma.ts                    -- Prisma client singleton
    strava.ts                    -- Strava API helpers
    garmin.ts                    -- Garmin API helpers (Phase 2)
    normalizers.ts               -- activity normalizers (multi-source)
    deduplication.ts             -- duplicate detection
    polyline.ts                  -- GPS route decoder
    utils.ts                     -- formatting helpers
    i18n.ts                      -- translation helpers
    scoring/
      index.ts                   -- scoring engine dispatcher
      age-grade.ts               -- WMA age-graded scoring
      category.ts                -- category group scoring
      personal-improvement.ts    -- improvement % scoring
      age-grade-tables.json      -- WMA lookup data

  services/                      -- business logic (server-only)
    activity.service.ts          -- CRUD + sync + dedup
    challenge.service.ts         -- lifecycle + scoring
    group.service.ts             -- group management + membership
    user.service.ts              -- profile management
    sync.service.ts              -- provider sync orchestration
    webhook.service.ts           -- webhook processing

  hooks/                         -- client-side React hooks
    useActivities.ts
    useChallenges.ts
    useLeaderboard.ts
    useGroupMembers.ts
    useLocale.ts

  providers/
    Providers.tsx                -- auth + query + locale
    LocaleProvider.tsx           -- RTL/language context

  types/
    activity.ts
    strava.ts
    garmin.ts
    challenge.ts
    group.ts
    user.ts
    next-auth.d.ts

  i18n/
    he.json                      -- Hebrew translations
    en.json                      -- English translations

prisma/
  schema.prisma                  -- database schema
```

---

## Build Order

### Phase 1A: Database Foundation (Week 1-2)
1. Install Prisma + PostgreSQL
2. Define full schema (all models above)
3. Add Prisma adapter to NextAuth (keep JWT strategy, add DB persistence)
4. Create service layer: `user.service.ts`, `activity.service.ts`
5. Sync Strava activities to DB on login
6. Keep existing Strava proxy routes working during transition

### Phase 1B: Groups + Roles (Week 2-3)
1. Add Group, GroupMembership models
2. Coach registration flow (email/password via Credentials provider)
3. Group creation UI for coaches
4. Invite-code join flow for athletes
5. Role in session + proxy routing (coach vs athlete)

### Phase 1C: Challenges (Week 3-5)
1. Challenge, ChallengeEntry, ChallengeActivityLink models
2. Challenge creation form for coaches
3. Scoring engine: Personal Improvement first (simplest)
4. Leaderboard view for athletes
5. Category scoring
6. Age Grade scoring (import WMA tables)

### Phase 1D: Strava Webhooks (Week 5-6)
1. Register for Strava webhook events
2. Implement `/api/webhooks/strava`
3. Auto-ingest activities on webhook fire
4. Recalculate challenge scores on new activity
5. Remove manual sync dependency

### Phase 1E: RTL / Hebrew (Week 6-7)
1. Add Heebo font + LocaleProvider
2. Audit components for directional CSS
3. Add Hebrew translations
4. Update formatters for Hebrew locale

### Phase 1F: Messages + Events + Polish (Week 7-8)
1. Group messaging (chat + announcements)
2. Events feature
3. Prizes display
4. Error handling, loading states everywhere
5. PWA basics (manifest, service worker)

### Phase 2 (Post-Launch)
- Garmin API integration
- Activity deduplication
- Payment/subscription system
- Push notifications
- Coach analytics
- Multi-group support for athletes
- Platform admin panel

---

## Migration Strategy

### Principle: Incremental evolution, never break what works.

1. **Add Prisma alongside existing code** — no changes to working routes
2. **Wire NextAuth to DB** — adapter auto-creates User/Account rows, JWT still works
3. **Background activity sync** — persist Strava data to DB on login
4. **Switch reads to DB** — new `/api/athlete/activities` reads from DB
5. **Deprecate old routes** — remove `/api/strava/*` once new routes confirmed
6. **Add new features on top** — groups, challenges, leaderboards are purely additive

At every step, the existing app remains functional.

---

## Environment Variables

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<random-32-byte-base64>

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/triforce

# Strava
STRAVA_CLIENT_ID=<your-client-id>
STRAVA_CLIENT_SECRET=<your-client-secret>
STRAVA_WEBHOOK_VERIFY_TOKEN=<random-string-for-webhook-validation>

# Garmin (Phase 2)
GARMIN_CONSUMER_KEY=<pending>
GARMIN_CONSUMER_SECRET=<pending>

# Maps (optional — defaults to free OpenStreetMap)
# NEXT_PUBLIC_MAPBOX_TOKEN=<if-using-mapbox>
```

---

## Screens Summary

### Athlete App
1. **Dashboard** — greeting, connection status, active challenge progress, notifications
2. **Challenge Detail** — progress per metric, days remaining, prize info
3. **Leaderboard** — overall + by category, own row highlighted, prize threshold
4. **Activity Feed** — all synced activities, filter by sport, source badge
5. **Messages** — broadcasts + personal thread with coach
6. **Profile** — stats, categories, device connections, events
7. **Events** — upcoming races, countdown, teammates registered

### Coach App
1. **Coach Home** — active challenges overview, group stats, pending messages
2. **Create Challenge** — sport type, goals, scoring method, dates, prizes
3. **Challenge Management** — all challenges, progress, qualification status
4. **Athlete Manager** — all athletes, connection status, last sync
5. **Broadcast Messages** — compose, audience filter, send, read receipts
6. **Personal Messages** — individual conversations
7. **Events Manager** — create/edit events, link to challenges

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
      athlete/
        activities/route.ts
        activities/[id]/route.ts
        challenges/route.ts
        friends/route.ts
        groups/route.ts
        groups/join/route.ts
        members/route.ts
        members/[id]/follow/route.ts
        me/route.ts
        strava-clubs/route.ts
        strava-clubs/[id]/members/route.ts
        strava-kudos/route.ts
        strava-contacts/[contactId]/route.ts
        mutual-friends/route.ts
        sync/route.ts
        users/search/route.ts
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
6. **Follow system** — Follow model, follow/unfollow API, friends list
7. **Strava Clubs discovery** — fetch clubs, cross-reference members with TriForce
8. **Kudos-based discovery** — find friends through activity likes

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

## Athlete Home Architecture (Current Design)

The athlete operates in TWO parallel contexts simultaneously:

### Context 1 — "עם המאמן שלי" (With My Coach)
- Join a coach's group via 6-char invite code (Settings page)
- See coach-defined challenges + group leaderboard
- Receive broadcast messages from coach
- Structured training with formal scoring

### Context 2 — "עם החברים שלי" (With My Friends / Peers)
- Choose friends from Strava kudos contacts (`StravaContact.isChosen = true`)
- Mutual friends = in same Strava club AND gave kudos (cross-reference API)
- Per-friend actions: compare stats / create peer challenge / send message
- Informal, self-organized, sport-specific

### Key Rule
A Strava contact NOT on TriForce → show "הזמן ל-TriForce" instead of compare/challenge.
A TriForce user → full comparison from DB activities.

### Athlete Home Screen (`/dashboard`) — Planned Rebuild
```
[Header: greeting + Strava sync status]

[Wing 1 — עם המאמן שלי]
  If in group  → active challenge card + group name
  If no group  → CTA "הצטרף לקבוצה" with invite code input

[Wing 2 — עם החברים שלי]
  Avatar row of chosen friends (isChosen=true)
  Per friend: [📊 השווה] [🏆 אתגר] [💬 הודעה]
  "+ הוסף חברים" → /members kudos tab

[Quick links row]
  🏃 היסטוריה | 📅 אירועים | ⚙️ הגדרות
```

### Peer Features — Build Order
1. **Athlete home rebuild** — hub with two wings (next to build)
2. **`/compare/[contactId]`** — side-by-side stats per sport type, no new DB needed
3. **`FriendChallenge` model** — peer challenge: sport / metric / goal / duration / status
4. **Peer challenge UI** — create, track, winner declaration
5. **Friend invitation** — invite non-TriForce Strava contacts via share link

### FriendChallenge DB Model (planned)
```prisma
model FriendChallenge {
  id           String   @id @default(cuid())
  challengerId String   // who created it
  challengedId String   // who received it
  sportType    String
  metric       String   // DISTANCE | ELEVATION | TIME | ACTIVITIES
  goalValue    Float
  startDate    DateTime
  endDate      DateTime
  status       String   // PENDING | ACTIVE | COMPLETED | DECLINED
  winnerId     String?
  description  String?
  createdAt    DateTime @default(now())
}
```

---

## Coach App Architecture (Current State — Built)

### `/coach` — Navigation Hub
6 cubes: מתאמנים, אתגרים, הודעות, אירועים, סטטיסטיקות, קבוצות

### `/coach/stats` — Stats Dashboard
4 stat cards (athletes / workouts / adherence / messages) + athlete status table
(תקין / לעקוב / דורש תשומת לב) + attention panel + bar chart + challenge card

### `/coach/groups` — Group Management
List of groups with invite codes. Create new group → get 6-char code → share with athletes.

### Auth Guards (temporarily removed — re-add before launch)
- `(coach)/layout.tsx` — no role check
- `(athlete)/layout.tsx` — no auth check
- `POST /api/coach/groups` — only checks session exists, not role

---

## API Routes (current)

### Athlete
- `GET /api/athlete/activities` — from DB
- `GET /api/athlete/activities/[id]` — single activity
- `GET /api/athlete/challenges` — active challenges
- `GET /api/athlete/friends` — TriForce follows
- `GET /api/athlete/groups` — groups with invite codes
- `POST /api/athlete/groups/join` — join via invite code
- `GET /api/athlete/members` — group members
- `POST /api/athlete/members/[id]/follow` — toggle follow
- `GET /api/athlete/me` — fresh profile from DB
- `GET /api/athlete/strava-clubs` — Strava clubs list
- `GET /api/athlete/strava-clubs/[id]/members` — club members
- `GET /api/athlete/strava-kudos` — kudos contacts from DB (scan on ?refresh=1)
- `POST /api/athlete/strava-contacts/[id]` — toggle isChosen
- `GET /api/athlete/mutual-friends` — cross-reference clubs × kudos contacts
- `POST /api/athlete/sync` — manual Strava sync
- `GET /api/athlete/users/search` — search TriForce users
- `GET /api/athlete/feed` — activity feed from followed users
- `GET /api/athlete/messages` — inbox
- `GET /api/athlete/events` — upcoming events

### Coach
- `GET /api/coach/dashboard` — stats, athletes, weekly chart, groups
- `GET/POST /api/coach/groups` — list/create groups
- `GET /api/coach/groups/[groupId]/messages` — group messages
- `POST /api/coach/groups/[groupId]/messages` — send message
- `GET/POST/DELETE /api/coach/groups/[groupId]/events` — events

---

## Screens Summary

### Athlete App (current + planned)
1. **Home** (`/dashboard`) — TWO WINGS: coach context + friends context [PLANNED REBUILD]
2. **Compare** (`/compare/[id]`) — head-to-head stats per sport [PLANNED]
3. **Peer Challenge** — create/track friend vs friend challenge [PLANNED]
4. **Members/Friends** (`/members`) — kudos friends, mutual friends, club members, TriForce follows
5. **Challenges** (`/challenges`) — coach-set group challenges
6. **Activities** (`/activities`) — full activity history
7. **Messages** (`/messages`) — inbox from coach
8. **Events** (`/events`) — upcoming group events
9. **Settings** (`/settings`) — join group via code, Strava status, language

### Coach App (current)
1. **Coach Home** (`/coach`) — 6-cube navigation hub
2. **Stats** (`/coach/stats`) — athlete status table, 4 cards, bar chart
3. **Groups** (`/coach/groups`) — group list with invite codes
4. **New Group** (`/coach/groups/new`) — create group
5. **Group Detail** (`/coach/groups/[id]`) — members, challenges, invite code
6. **Messages** (`/coach/groups/[id]/messages`) — broadcast compose + history
7. **Events** (`/coach/groups/[id]/events`) — create + manage events
8. **New Challenge** (`/coach/groups/[id]/challenges/new`) — challenge creation form

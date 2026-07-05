# TriForce — Production Platform Plan

## What Is TriForce

A multi-tenant team sports challenge platform for endurance athletes.
- A **coach** creates challenges for their training group
- **Athletes** connect Garmin/Strava — data syncs automatically
- The platform tracks progress, displays leaderboards, and awards prizes

Primary language: **Hebrew (RTL)**. English as future option.
Starting with ~40 athletes in one coaching group in Israel.

---

## Current State (as of 2026-07-04)

**Live at:** https://triforce-iota.vercel.app

### Working
- Next.js 16 + TypeScript + Tailwind CSS + Neon PostgreSQL + Prisma 5
- Strava OAuth (NextAuth v4, JWT) — single login for all users
- Activity sync: full history (months=0), webhooks, manual sync button; client-side filtering
- Dashboard: trainings-first layout (events → activities → coach → friends), sport + time filters
- Activity detail with route map (Leaflet.js)
- Mobile-first Hebrew RTL layout (Heebo font, i18n/he.json + en.json)
- Groups (COACH + PEER): create, list all, detail, add/remove members, delete, messaging
- Friends: Strava kudos + mutual clubs (scan-once), compare stats, invite via WhatsApp
- **Unified challenges system**: GOAL_BASED scoring, coach or athlete creates, group or friend-based, invite flow, leaderboard, reference pace table
- Notifications: in-app for group invites + challenge invites; badge in nav
- Roles: any user can become a coach (multi-role capability model)
- Coach hub: fully audited — all 7 cubes translated to Hebrew, athlete detail, group settings, stats with CSV export
- Compare: side-by-side stats between any two TriForce users
- **Role-first entry gate** (`/gate`): athlete / personal trainer / team trainer selector with cookie-based routing
- **Activity-to-challenge flow**: sport type and distance locked to source activity; simulation uses correct min/km formatting
- **User-level tolerance setting**: stored on `User`, editable in Settings, default 30%

### Deferred to pre-launch
- COACH role gate re-enablement (currently any authenticated user can access /coach)
- Personal conversation threads (athlete ↔ coach)
- PWA manifest + service worker
- Full error/loading/empty state audit

### Next up
- Wire user-level `tolerancePercent` default into new challenge creation
- Challenge UX polish: group challenges tab in `/groups/[groupId]`
- Challenge leaderboard real-time updates
- Prize display on challenges

### Architecture note — sync vs filter separation
Sync and filtering are fully decoupled:
- **Sync** (`POST /api/athlete/sync`) → pulls from Strava API → upserts to DB → records `lastStravaSync` timestamp
- **Filter** → client-side `useMemo` on already-fetched data → zero network calls → instant
- This pattern must be maintained for all future list views

---

## Role-First Architecture (2026-07-04)

### Decision

TriForce is now treated as **two separate in-app systems**, chosen explicitly by the user at an entry gate:

- **Athlete System** — for trainees: dashboard, friends, challenges, history, messages, events, groups, compare.
- **Coach System** — for coaches: athletes, challenges, messages, events, statistics, groups, friends.

A user can still hold both capabilities in the database, but each session begins with a single active role. Switching roles requires returning to the entry gate.

### Why

The previous model allowed a logged-in user to fluidly move between `/athlete` and `/coach` contexts. In practice this created a confused mental model: the same navigation contained both trainee and coach actions, and permission logic had to be enforced per page. The role-first model gives each session a single, coherent identity.

### Entry Gate (`/gate`)

After authentication, the user lands on `/gate` and must choose one of three large, colorful rectangles:

| Color | Label | Underlying system | Redirects to |
|---|---|---|---|
| Green | ספורטאי | Athlete System | `/athlete` |
| Blue | מאמן אישי | Coach System | `/coach` |
| Indigo | מאמן קבוצה | Coach System | `/coach` |

Top of the gate shows the TriForce logo, a large **"Sports App"** caption, and the subtitle **"בחרו את המערכת המתאימה לכם"**. Each rectangle contains the title, description, and badge inside it — no separate icon boxes.

Rules:
1. No default selection — the user must actively choose.
2. The choice is stored in an HTTP-only cookie: `triforce_role=athlete\|coach`.
   - Personal trainer and team trainer both store `coach` because they share the same coach system; only the gate label differs.
3. Route guards read this cookie; an athlete-cookie cannot access `/coach/*` and vice versa.
4. The only way to switch roles is to return to `/gate` (via logout or a settings action).
5. The database `roles String[]` capability remains, but the active role is determined by the cookie, not the user record.

### Visual Identity

| System | Primary Color | Logo Variant | Navigation |
|---|---|---|---|
| Athlete | Green (`#16a34a`) | TriForce | Bottom nav: בית / חברים / היסטוריה / אתגרים / פרופיל |
| Coach | Blue (`#2563eb`) | TriForce Coach | Bottom nav: בית / מתאמנים / אתגרים / קבוצות / הגדרות |

### Routing Changes

| URL | Behavior |
|---|---|
| `/` | Public landing for unauthenticated users; authenticated users redirect to `/gate` |
| `/gate` | Role selector; no shell layout |
| `/athlete/*` | Requires `triforce_role=athlete` |
| `/coach/*` | Requires `triforce_role=coach` |

### Implementation Files

1. `src/app/gate/page.tsx` — role selector UI
2. `src/app/gate/layout.tsx` — clean gate layout
3. `src/proxy.ts` — add role-cookie enforcement
4. `src/lib/auth.ts` — redirect first login to `/gate`
5. `src/app/page.tsx` — authenticated users go to `/gate`
6. `src/app/(athlete)/layout.tsx` + `src/app/(coach)/layout.tsx` — enforce role cookie
7. `src/components/layout/BottomNav.tsx` — render role-specific items
8. `src/components/layout/Header.tsx` — remove cross-role links

---

## Unified Challenges Design

Both coaches and athletes create challenges through the **same flow** and the **same data model**. The only differences are context (who invited whom) and default settings.

### Core model
```
Challenge {
  createdById   String           — who created it
  groupId       String?          — optional: scoped to a group
  sportType     String           — "run" | "ride" | "swim"
  distanceKm    Float            — target distance
  metric        String           — "pace" | "time" | "distance" | "elevation" | "activities"
  targetValue   Float?           — optional explicit goal
  scoringMethod GOAL_BASED       — score 0–100 based on tolerance % around expected pace
  startDate / endDate
  status        DRAFT → ACTIVE → COMPLETED
}

ChallengeEntry {
  challengeId / userId
  status   INVITED → ACCEPTED → DECLINED → ACTIVE → COMPLETED
  score    Float
}
```

### Two creation contexts — same form

| | Coach creates | Athlete creates |
|---|---|---|
| Entry point | `/coach` → אתגרים cube OR `/coach/groups/[id]` | `/challenges/new` or `/groups/[id]` → אתגרים tab |
| Scope | Linked to a group (`groupId` set) | Can be group-based or between friends (no `groupId`) |
| Invite | All group members auto-enrolled | Manually invite chosen friends |
| Scoring | GOAL_BASED (default) | GOAL_BASED (default) |
| Reference pace | Shown from `SportReferencePace` table | Same |

### Scoring — GOAL_BASED
1. For each activity in the challenge window matching `sportType` and `distanceKm` (±30%):
   - Compute expected pace from `SportReferencePace` for user's age/sex/distance
   - Score = 100 × (expectedPace / actualPace), clamped 0–100
   - Bonus for beating expected pace; penalty for falling short
2. Athlete's entry score = best single activity score in the window
3. Leaderboard ranks by score descending

### Key API routes
- `POST /api/challenges` — create (any authenticated user)
- `GET  /api/challenges` — list user's challenges (all groups + friend challenges)
- `GET  /api/challenges/[id]` — detail + leaderboard
- `POST /api/challenges/[id]/accept` — accept invite
- `POST /api/challenges/[id]/decline` — decline invite
- `GET  /api/challenges/reference-pace` — pace table for the creation form
- `GET  /api/athlete/groups/[groupId]/challenges` — challenges scoped to a group (member-accessible)

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

## Core Architecture Principle — Scan Once, Read from DB

**Every piece of data that requires an external scan (Strava API, Garmin API, club members, kudos contacts, mutual friends, leaderboard scores, or any other source that costs API calls or computation) is fetched once, persisted to the database with a `scannedAt` / `updatedAt` timestamp, and served from the DB on every subsequent request.**

### Rules:
1. **Default GET = DB read.** No endpoint may call an external API or do heavy computation automatically on every page load.
2. **Refresh is always explicit.** The user triggers a re-scan via a button, or the system triggers it via webhook/cron. Never on page load.
3. **Always store a timestamp.** Every cached record must record when it was last scanned so the UI can show "נסרק לאחרונה: [date]".
4. **Stale is better than slow.** If the DB has data from yesterday, show it. A spinner on every visit is worse than slightly stale data with a refresh button.
5. **Applies to:** Strava activities, Garmin data, club members, kudos contacts, mutual friends, leaderboard scores, group members, achievements, challenge scores — anything that involves network I/O or expensive computation.

### Pattern (already live for kudos + mutual friends):
```
GET /api/athlete/some-data          → reads from DB (fast, always)
GET /api/athlete/some-data?refresh=1 → scans external source, upserts DB, returns fresh data
```

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
- `type: GroupType` — `COACH` (coach-led, formal) | `PEER` (athlete-led, informal)
- `creatorId` — userId of who opened the group
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
- `PATCH /api/athlete/strava-contacts/[id]` — save stravaAthleteId from URL
- `GET /api/athlete/mutual-friends` — cross-reference clubs × kudos contacts
- `POST /api/athlete/sync` — manual Strava sync
- `GET /api/athlete/users/search` — search TriForce users
- `GET /api/athlete/feed` — activity feed from followed users
- `GET /api/athlete/messages` — inbox
- `GET /api/athlete/events` — upcoming events
- `GET /api/athlete/chosen-friends` — isChosen=true contacts (with stravaAthleteId)
- `GET /api/athlete/compare/[contactId]` — side-by-side stats (TriForce DB or Strava API)
- `GET /api/athlete/strava-following` — scan club members → save stravaAthleteId

### Invite
- `GET /api/invite/[inviterId]/info` — public: returns inviter name + photo
- `POST /api/invite/accept/[inviterId]` — links new user to inviter's StravaContact

### Coach
- `GET /api/coach/dashboard` — stats, athletes, weekly chart, groups
- `GET/POST /api/coach/groups` — list/create groups
- `GET /api/coach/groups/[groupId]/messages` — group messages
- `POST /api/coach/groups/[groupId]/messages` — send message
- `GET/POST/DELETE /api/coach/groups/[groupId]/events` — events

---

## Screens Summary

### Screenshot Reference Files
Actual screenshots of the running app are stored in `/screenshots/`:
- `01-landing.png` — landing page (4 cubes)
- `02-athlete-dashboard.png` — athlete home (2 wings)
- `03-activities-list.png` — activity history list
- `04-activity-detail.png` — single activity + route map
- `05-challenges-list.png` — active challenges
- `06-challenge-detail.png` — challenge + leaderboard
- `07-settings.png` — settings page
- `08-coach-signin.png` — coach login
- `09-coach-dashboard.png` — coach stats dashboard
- `10-coach-groups.png` — coach group management
- `11-members.png` — members/friends page

### Athlete App (current)
1. **Home** (`/dashboard`) — two wings: coach context + friends context
2. **Athlete Hub** (`/athlete`) — 7 cubes: הבית שלי, חברים, אתגרים, היסטוריה, הודעות, אירועים, השוואה
3. **Compare Hub** (`/compare`) — friend cards with 🏃🚴🏊 sport buttons + WhatsApp invite
4. **Compare Detail** (`/compare/[contactId]`) — side-by-side stats, period/sport tabs
5. **Invite** (`/invite/[userId]`) — public landing page for friend invites (Strava connect)
6. **Members/Friends** (`/members`) — kudos friends, mutual friends, club members, TriForce follows
7. **Challenges** (`/challenges`) — coach-set group challenges
8. **Activities** (`/activities`) — full activity history
9. **Messages** (`/messages`) — inbox from coach
10. **Events** (`/events`) — upcoming group events
11. **Settings** (`/settings`) — join group via code, Strava status, language

### Production Deployment
- **URL**: https://triforce-iota.vercel.app
- **Repo**: github.com/rkcycl-beep/triforce
- **DB**: Neon PostgreSQL (eu-central-1) — DATABASE_URL uses `-pooler` endpoint + `?pgbouncer=true`
- **Auth**: NextAuth v4 JWT strategy — Strava OAuth callback = triforce-iota.vercel.app
- **Strava app**: athlete limit = 10 (Standard Tier)

### Coach App (current)
1. **Coach Home** (`/coach`) — 6-cube navigation hub
2. **Stats** (`/coach/stats`) — athlete status table, 4 cards, bar chart
3. **Groups** (`/coach/groups`) — group list with invite codes
4. **New Group** (`/coach/groups/new`) — create group
5. **Group Detail** (`/coach/groups/[id]`) — members, challenges, invite code
6. **Messages** (`/coach/groups/[id]/messages`) — broadcast compose + history
7. **Events** (`/coach/groups/[id]/events`) — create + manage events
8. **New Challenge** (`/coach/groups/[id]/challenges/new`) — challenge creation form

---

## Challenges System — KIMI Unified Design (2026-06-23)

> **Design Assistant:** This challenges system redesign was architected in collaboration with **KIMI** (Kimi Code CLI). It unifies coach-created and trainee-created challenges under one data model, with sport-specific, age/gender-adjusted scoring, invitation lifecycle, and rich comparison analytics.
>
> **Implementation status (2026-06-23):** Schema, scoring engine, API, and core UI are built and tested locally. Remaining work: entry points polish, notifications badge, i18n extraction, real amateur-average reference data, and deployment.

### Overview

A **Challenge** is a goal-based competition defined by a creator, a sport, a distance, a time window, and explicit invitations. The same lifecycle and scoring engine are used whether the creator is a coach or a trainee.

| Creator | Can Invite |
|---|---|
| Coach | Teams / groups + individual trainees |
| Trainee | Friends (chosen friends / TriForce follows) only |

### Core Rules

1. **One model for everyone** — no separate coach vs trainee challenge tables.
2. **Invitation required** — recipients must accept or decline; sender is notified.
3. **Age/gender adjusted scoring** — full score is given for running near the expected pace for the participant's age and gender, with a configurable tolerance range.
4. **Sport-specific parameters** — running uses pace (min/km); cycling will use speed (km/h); swimming will use pace per 100 m.
5. **Track from DB** — activities are already synced; challenge scoring reads from the `Activity` table, following the existing "scan once, read from DB" rule.
6. **Analytics-ready** — every state and score is persisted, enabling success rates, trends, comparisons, and leaderboards.

### Data Model Changes

#### New and updated Prisma models

- **`Challenge`** — adds `createdById`, `sportType`, `distanceKm`, `metric`, `targetValue`, `targetUnit`, `tolerancePercent`, `bonusFactor`, `penaltyFactor`. `groupId` becomes optional so friend challenges do not require a group.
- **`ChallengeEntry`** — extended with `status` (`INVITED`, `ACCEPTED`, `DECLINED`, `COMPLETED`), `invitedAt`, `respondedAt`, `completedAt`, `actualPace`, `expectedPace`, `tolerancePace`, `progressValue`, and `score`.
- **`ChallengeActivityLink`** — extended with `value` and `isBest` so the best counted activity is tracked.
- **`SportReferencePace`** — new table storing expected pace by `sportType`, `gender`, `age`, and `distanceKm`.
- **`Notification`** — new table for challenge invites, acceptances, declines, and completion notices.

#### Relationships

```
User 1--* Challenge           (created challenges)
User 1--* ChallengeEntry      (participation + score)
User 1--* Notification        (inbox)
Challenge 1--* ChallengeEntry
ChallengeEntry 1--* ChallengeActivityLink
Activity 1--* ChallengeActivityLink
SportReferencePace (lookup table)
```

### Scoring Method

For running, the reference table gives the expected average pace for the participant's age and gender.

```text
expectedPace  = SportReferencePace(age, gender, distanceKm)
tolerancePace = expectedPace × (1 + tolerancePercent / 100)
actualPace    = activity moving time (min) / distance (km)

if actualPace <= expectedPace:
    score = 100 + ((expectedPace / actualPace) - 1) × bonusFactor
elif actualPace <= tolerancePace:
    score = 100
else:
    score = 100 × (tolerancePace / actualPace)
```

- **Exact expected pace** = 100 points.
- **Within tolerance range** = 100 points (forgiving zone).
- **Faster than expected** = bonus above 100.
- **Slower than tolerance** = penalty below 100.

The tolerance percentage is configurable per challenge and will later be editable from a setup page.

### Reference Table UI

A colorful, Hebrew-explained table is shown on demand:

> **איך מחושב הניקוד?**
> הריצה שלך נמדדת מול הקצב הממוצע לגיל ולמגדר שלך.
> 🟢 בטווח הירוק — 100 נקודות
> 🔵 מהיר יותר — בונוס
> 🔴 איטי מדי — ניקוד יורד

The table displays expected pace, full-score range, bonus zone, and penalty zone per age group.

### Invitation Lifecycle

1. **Create** — creator fills sport, distance, dates, tolerance, and recipients.
2. **Send** — system creates `Challenge` + `ChallengeEntry` rows with `INVITED` status + `Notification` for each recipient.
3. **Receive** — recipient sees the challenge in the challenges inbox with **אשר השתתפות** / **דחה** buttons.
4. **Respond** — status changes to `ACCEPTED` or `DECLINED`; creator receives a `Notification`.
5. **Active** — on `startDate`, challenge becomes `ACTIVE`; accepted participants can start scoring.
6. **Track** — every synced activity matching sport/distance/date is evaluated; the best attempt is kept.
7. **Complete** — on `endDate`, status becomes `COMPLETED` and final ranks are locked.

### Tracking Flow

- Activity sync (manual or Strava webhook) writes to `Activity`.
- Challenge scoring job reads `Activity` for each active challenge participant.
- Qualifying activities (correct sport, distance ≥ challenge distance, date in range) are linked via `ChallengeActivityLink`.
- The participant's best attempt updates `ChallengeEntry` with `actualPace`, `expectedPace`, `tolerancePace`, and `score`.
- Leaderboard reads `ChallengeEntry` ordered by `score DESC`.

### Comparison & Results

Everyone with access to the challenge sees:

- Challenge card (title, dates, sport, distance, my status, my score).
- **Leaderboard** ranked by score with actual pace, expected pace, status, and completion badge.
- **My result card** showing my actual pace, expected pace, tolerance pace, and the counted activity.
- **Reference table button** to open the colorful scoring explanation.

The creator also sees:

- Invitation status panel (accepted / declined / pending).
- Admin actions: remind, edit (before start), cancel.

### Analytics Examples

Because all states are persisted, queries like these are possible:

- How many challenges did David complete in the last 3 months?
- What is David's success rate (completed / accepted)?
- Best performing sport for each athlete.
- Monthly completion trend.
- Cross-athlete leaderboard across all challenges.
- How many activities it took to complete a challenge.

### API Design

Recommended unified endpoints:

```text
POST   /api/challenges                    — create challenge + send invitations
GET    /api/challenges                    — list my challenges (created + invited)
GET    /api/challenges/[id]               — challenge detail + leaderboard
PATCH  /api/challenges/[id]               — edit (creator only, before start)
DELETE /api/challenges/[id]               — cancel/delete (creator or group owner)
POST   /api/challenges/[id]/accept        — accept invitation
POST   /api/challenges/[id]/decline       — decline invitation
POST   /api/challenges/[id]/remind        — remind pending invitees (creator only)
```

### Development Stages

1. **Schema & migration** — update Prisma schema, create `SportReferencePace` and `Notification`, push to Neon.
2. **Reference data** — seed running pace table for 5K, 10K, half marathon, marathon by age/gender.
3. **Scoring engine** — implement age/gender/tolerance scoring function.
4. **Challenge API** — create, read, update, delete, accept, decline.
5. **Notifications** — invite/response messages.
6. **Activity integration** — wire scoring into sync and webhook handlers.
7. **UI components** — challenge form, reference table modal, inbox, detail/leaderboard.
8. **Testing & polish** — demo users, edge cases, empty/loading/error states, screenshots.

### Backward Compatibility

Existing challenges using `ScoringMethod` (`AGE_GRADE`, `CATEGORY`, `PERSONAL_IMPROVEMENT`) are preserved. New fields are additive. Old challenges continue to work while new goal-based challenges use the KIMI-designed scoring flow. If desired, the old scoring methods can be exposed later as "advanced challenge types" within the same unified model.


---

## Coach Cube Audit & Repair Plan (2026-06-26) ✅ COMPLETED

> Goal: verify every cube in the coach hub works according to the original platform plan, then fix gaps.

**Status:** All cubes audited and repaired. Deployed to production on 2026-06-26.

### Audit method
For each cube:
1. Test the happy path in production.
2. Compare current behavior to the original `PLAN.md` intent.
3. List gaps: functionality, Hebrew/i18n, UX, auth, data accuracy.
4. Define concrete fixes.

### Execution order (completed)
1. ✅ **Messages** — full Hebrew i18n (quick win).
2. ✅ **Events** — full Hebrew i18n + fix delete (quick win).
3. ✅ **Challenges** — fix multi-group link + redirect back to coach context.
4. ✅ **Athletes / Statistics** — merged into one cube; added athlete drill-down.
5. ✅ **Groups** — audit links + added rename/delete settings.
6. ✅ **Friends** — added coach-context invite action banner.
7. ✅ **Final polish** — build, test, deploy.

---

### Cube 1 — מתאמנים (Athletes) → `/coach/stats`

**Current state:** Stats dashboard with 4 cards, athletes status table, attention panel, active-challenge card, weekly bar chart, groups nav.

**Gaps:**
- **מתאמנים and סטטיסטיקות cubes both point to `/coach/stats`.**
- Athlete rows are not clickable — no drill-down to individual athlete.
- No individual athlete detail page (history, message, progress).
- "Pending messages" stat counts all messages from last 7 days, not actual unread.
- Active challenge card links to the old coach URL (`/coach/groups/[id]/challenges/new`) instead of the unified form.
- Adherence logic is simplistic (≥3 workouts = adherent); weekly target hardcoded to 4.

**Fixes:**
- Decide: separate Athletes and Statistics pages, or merge into one cube.
- Create `/coach/athletes/[userId]` detail page with activity history + message button.
- Make athlete rows in `/coach/stats` clickable.
- Fix pending-messages count to use actual unread tracking (or rename the stat).
- Fix active-challenge link to `/challenges/new?groupId=...`.
- Add weekly-target configuration per group.

---

### Cube 2 — אתגרים (Challenges) → `/challenges/new?groupId=...`

**Current state:** Coach group challenge URL redirects to the unified colorful `/challenges/new`.

**Gaps:**
- If coach has **multiple groups**, the cube goes to `/coach/groups` instead of `/challenges/new` with group selector.
- After creating a challenge, redirect goes to `/challenges` (athlete view), not back to coach context.
- No coach-specific challenge management page (list created challenges, edit, cancel, remind).
- Prize display still deferred.

**Fixes:**
- Multiple-groups case: open `/challenges/new` with group selector visible.
- Add `redirectTo` param so coach returns to coach context after creation.
- Create `/coach/challenges` list page with management actions.
- Add edit/cancel/remind actions for draft/upcoming challenges.

---

### Cube 3 — הודעות (Messages) → `/coach/groups/[groupId]/messages`

**Current state:** Compose form + sent-history list.

**Gaps:**
- **Page is in English** ("Messages", "Sent messages", "Send a message", message type labels).
- No i18n extraction.
- No delete or edit.
- Only broadcast; no individual athlete messaging (deferred).
- Message type display hardcoded English.

**Fixes:**
- Extract all strings to `i18n/he.json` and `i18n/en.json`.
- Translate labels, placeholders, buttons, empty states to Hebrew.
- Style message-type badges consistently with athlete `/messages`.
- Add delete message action.

---

### Cube 4 — אירועים (Events) → `/coach/groups/[groupId]/events`

**Current state:** Create form + event list.

**Gaps:**
- **Page is in English** ("Events", "All events", "Create an event", dates).
- No i18n extraction.
- **Delete button is non-functional** (`CoachEventDelete` renders an empty form).
- No edit event.
- Date/time pickers may not be RTL-friendly.

**Fixes:**
- Extract all strings to i18n.
- Translate to Hebrew.
- Fix delete button (POST with `_method=DELETE` or use API call).
- Add edit event flow.
- Verify RTL date/time inputs.

---

### Cube 5 — סטטיסטיקות (Statistics) → `/coach/stats`

**Current state:** Same page as Athletes cube.

**Gaps:**
- Same destination as Athletes cube — confusing.
- Lacks richer analytics (trends over time, per-sport breakdown, export).
- Weekly target hardcoded to 4.

**Fixes:**
- Merge with Athletes cube OR create dedicated Statistics page.
- Add date-range filter.
- Add per-sport activity breakdown.
- Add export to CSV.
- Make weekly target configurable per group.

---

### Cube 6 — קבוצות (Groups) → `/coach/groups` + `/coach/groups/[id]`

**Current state:** Group list with invite action; group detail with members, invitations, challenges.

**Gaps:**
- Group detail challenge links may still use old URL in some places.
- No group settings (rename, delete) from the list.
- Coach cannot create PEER groups (only COACH groups).
- Some CTAs still hardcoded.

**Fixes:**
- Audit all group-detail challenge links.
- Add group settings: rename, delete from `/coach/groups` list.
- Verify all strings are i18n'd.
- Keep PEER group creation athlete-only per PLAN.md.

---

### Cube 7 — חברים (Friends) → `/members`

**Current state:** Coach cube links to the same `/members` page athletes use.

**Gaps:**
- No coach-specific flow to invite discovered friends directly into a group.
- Coach might see Strava kudos/clubs tabs that are less relevant.

**Fixes:**
- Keep the page shared (coaches are also athletes).
- Add a clear "הזמן לקבוצה" action when coming from coach context.
- Verify the page works for coach users.

---

### Completion criteria ✅
- ✅ Every coach cube has a Hebrew UI consistent with the rest of the app.
- ✅ Every interactive element (create, edit, delete, invite) works end-to-end.
- ✅ Navigation between cubes is logical and does not duplicate destinations.
- ✅ `npm run build` passes clean and production deploy succeeded on 2026-06-26.


---

## Athlete Dashboard Redesign — Trainings First (2026-06-26)

> Problem: the `/athlete` dashboard is dominated by the friends list. Trainings are hidden in a small "פעילות אחרונה" card with only 3 items, and upcoming events are not visible at all.
> Goal: make the training cube focus on the athlete's trainings — upcoming events + recent history.

### Design changes

1. **Top section: "האימונים שלי" (My trainings)**
   - First thing the athlete sees after the header.
   - Two subsections:
     - **אירועים קרובים** — upcoming coach/peer events (next 3–5).
     - **היסטוריית אימונים** — last 30 days of activities (expandable, 10 by default).
   - Sport filter toggle: All / Run / Ride / Swim / Other.
   - Time range toggle: 7 days / 30 days / All.

2. **Move friends section down**
   - Collapse to a compact "חברים פעילים" strip showing 3–4 recent friends.
   - "הצג הכל" link to `/members`.

3. **Keep coach group section**
   - Keep "עם המאמן שלי" but make it compact.
   - Show active challenge and quick link.

4. **Bottom quick-actions**
   - Keep History / Events / Settings shortcuts.

### Implementation tasks

- [ ] Reorder sections in `/app/(athlete)/athlete/page.tsx`.
- [ ] Add upcoming events fetch and section.
- [ ] Expand recent activities list (10 items) with "load more" / "view all".
- [ ] Add sport and time-range filters for activities.
- [ ] Minimize friends section to compact horizontal strip.
- [ ] Extract all new strings to `i18n/he.json` and `i18n/en.json`.
- [ ] Build, test, deploy.

### Completion criteria
- Athlete sees trainings first when opening `/athlete`.
- Upcoming events visible without navigating away.
- At least 30 days of activity history accessible on the dashboard.
- No Hebrew hardcoded strings remain in the dashboard.
- Build passes and production deploy succeeds.


---

## Session Handoff — 2026-06-26

This section summarizes the work completed at the end of the current conversation, before starting the next one.

### Completed since last handoff
1. **Athlete dashboard redesign** — `/dashboard` now shows trainings first: upcoming events, last-30-days activity history with sport/time filters, compact friends strip.
2. **Coach cube audit & repair** — all 7 coach hub cubes reviewed and fixed:
   - Messages and Events fully translated to Hebrew with delete/edit actions.
   - Challenge creation links unified to the colorful `/challenges/new` form.
   - Athletes and Statistics cubes merged; athlete rows drill down to new `/coach/athletes/[id]` detail page.
   - Group list gained rename/delete actions.
   - Friends cube added coach-context invite banner.
3. **Challenge detail page** — compact, colorful breakdown with horizontal cube row (distance, expected pace from reference table, dates).
4. **Activity → challenge** — any past activity can be simulated as a challenge or turned into a real challenge; form is pre-filled.
5. **Reference pace** — interpolation added for non-standard distances; cycling fallback and seed data added.
6. **Error handling** — simulation shows friendly Hebrew message when profile lacks age/gender.

### Production
- Latest deploy: **https://triforce-iota.vercel.app**
- Git `main` is clean and up to date.

### Suggested next topics
- Audit remaining athlete cubes.
- Finish challenge management (edit, cancel, reminders, prizes).
- Build peer-group / friend-challenge flows.
- Polish and deploy.

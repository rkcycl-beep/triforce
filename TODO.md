# TriForce — Build Progress Tracker

## Status Legend
- [ ] Not started
- [x] Complete
- [~] In progress

---

## Architectural Rule — Scan Once, Read from DB

> **Any data that requires an external scan is fetched once, saved to the DB with a timestamp, and read from the DB on every subsequent request. Re-scanning only happens on explicit user action or a system trigger (webhook / cron). This applies to: Strava activities, club members, kudos contacts, mutual friends, leaderboard scores, challenge scores, group members, achievements — everything.**
>
> Pattern:
> - `GET /api/...`           → DB read (fast, no external calls)
> - `GET /api/...?refresh=1` → external scan → upsert DB → return fresh data
>
> Already live: strava-kudos, mutual-friends, activity sync.
> Must be respected in every new feature going forward.

---

## POC (Complete)
- [x] Next.js 16 project setup
- [x] Tailwind CSS + TypeScript
- [x] Strava OAuth (NextAuth v4, JWT)
- [x] Strava token auto-refresh
- [x] Activity fetching from Strava API
- [x] Unified Activity type (multi-source ready)
- [x] Dashboard: stats cards, weekly chart, activity list
- [x] Activity detail page with route map (Leaflet)
- [x] Mobile-first responsive layout (Shell, BottomNav, Header)
- [x] Utility formatters (distance, duration, pace, date)
- [x] Error boundaries per section
- [x] TanStack Query for data caching

---

## Phase 1A: Database Foundation
- [x] Install Prisma + create prisma/schema.prisma
- [x] Define all models: User, Group, GroupMembership, ProviderAccount, Activity, Challenge, ChallengeEntry, ChallengeActivityLink, Message, Event, Prize
- [x] Define enums: Role, ScoringMethod, ChallengeStatus, MessageType
- [x] Set up Neon PostgreSQL database (eu-central-1)
- [x] Run initial schema push (npx prisma db push)
- [x] Create src/lib/prisma.ts (Prisma client singleton)
- [x] Add @next-auth/prisma-adapter to NextAuth config
- [x] Verify: Strava login still works + User/Account rows appear in DB
- [~] Create services/user.service.ts (deferred — only one helper needed; inlined for now)
- [x] Create services/activity.service.ts (CRUD + upsert)
- [x] Create services/sync.service.ts (sync Strava activities to DB)
- [x] Trigger activity sync on login (jwt callback first-sign-in branch — signIn fires too early under JWT strategy)
- [x] Create /api/athlete/activities route (reads from DB)
- [x] Update useActivities hook to use new endpoint (renamed from useStravaActivities; 3 callers updated)
- [x] Verify: dashboard shows activities from DB, not live Strava API

---

## Phase 1B: Groups + Roles ✅ CLOSED
- [x] Coach registration: add Credentials provider (email/password) → later removed; Strava-only now
- [x] Create services/group.service.ts
- [x] Create /api/coach/groups route (create group)
- [x] Create /api/athlete/groups/join route (join via invite code)
- [x] Add role to NextAuth session
- [x] proxy.ts: protects /coach, /athlete, /groups, /members, /compare, /settings, /friends
- [x] (athlete)/layout.tsx: redirects unauthenticated users to /
- [x] (coach)/layout.tsx: any authenticated user can access (role gate deferred to pre-launch)
- [x] Coach sign-in/sign-up pages removed — single Strava login for all users
- [x] package.json build script: prisma generate runs before next build (fixes Vercel cache)
- [x] Create coach layout with sidebar navigation
- [x] Coach dashboard page (basic)
- [x] Group creation form UI
- [x] Invite code display for coach
- [x] Athlete join flow UI (enter invite code)
- [x] Member list page for coach

---

## Phase 1C: Challenges
- [x] Create services/challenge.service.ts
- [x] Create /api/coach/groups/[groupId]/challenges routes
- [x] Create /api/athlete/challenges routes
- [x] Challenge creation form (sport type, goals, dates, scoring method)
- [x] Scoring engine dispatcher: lib/scoring/index.ts
- [x] Personal Improvement scoring: lib/scoring/personal-improvement.ts
- [x] Category scoring: lib/scoring/category.ts
- [x] Age Grade scoring: lib/scoring/age-grade.ts
- [x] Import WMA age-grade tables: lib/scoring/age-grade-tables.json
- [x] Athlete challenge view (leaderboard + own score card)
- [x] Leaderboard component (overall + category label per athlete)
- [x] Challenge detail page
- [x] Recalculate scores on leaderboard request (pull model — Phase 1D webhooks will push)
- [ ] Prize display on challenge (deferred to Phase 1F polish)

---

## Phase 1D: Strava Webhooks
- [x] Create /api/webhooks/strava route (GET for validation, POST for events)
- [x] Handle activity.create event
- [x] Handle activity.update event
- [x] Handle activity.delete event
- [x] Auto-ingest activity on webhook -> normalize -> persist -> score
- [x] Register webhook subscription with Strava
- [~] Test with ngrok (dev) or staging deployment

---

## Phase 1E: RTL / Hebrew
- [x] Add Heebo font (Google Fonts, Hebrew + Latin subsets) — already done
- [x] Create LocaleProvider with RTL context — already done
- [x] Update root layout: dynamic lang + dir attributes — already done
- [x] Create i18n/he.json with all UI strings — already done
- [x] Create i18n/en.json (English fallback) — added missing `members` + `friends` namespaces
- [x] Create useTranslation() hook — already done
- [x] Audit all components: replace pl/pr/ml/mr with ps/pe/ms/me — fixed remaining 4 issues
- [x] Flip directional icons (arrows, chevrons) in RTL — fixed back-arrow in members page
- [x] Update formatDate for he-IL locale — already done
- [x] Update formatDistance: km -> "ק"מ" — already done
- [x] Update formatPace for Hebrew — already done
- [x] Extract hardcoded Hebrew strings — dashboard, landing, BottomNav, ErrorMessage now use `t()`
- [x] Build passes clean

---

## Phase 1F: Messages + Events + Polish
- [x] Create Message model routes (GET + POST /api/coach/groups/[groupId]/messages, GET /api/athlete/messages)
- [x] Coach broadcast compose + send (CoachMessageCompose.tsx — ANNOUNCEMENT or CHAT type)
- [x] Athlete message inbox (/messages page — shows all group messages)
- [ ] Personal conversation thread (athlete <-> coach) — schema needs toUserId field; deferred
- [ ] Unread message badges — needs read-tracking; deferred
- [x] Create Event model routes (GET/POST/DELETE /api/coach/…/events, GET /api/athlete/events)
- [x] Events list page (athlete) — /events with upcoming/past sections
- [x] Events manager page (coach) — /coach/groups/[groupId]/events with create form + list
- [ ] Link challenge to event — deferred to Phase 2
- [ ] PWA manifest.json
- [ ] Service worker basics
- [ ] Error handling audit (all pages)
- [ ] Loading state audit (all pages)
- [ ] Empty state audit (all pages)

---

## Phase 2 (Post-Launch)
- [ ] Garmin API integration (OAuth + activity sync)
- [ ] Activity deduplication (Garmin + Strava)
- [ ] Payment/subscription system
- [ ] Push notifications
- [ ] Coach analytics dashboard
- [ ] Multi-group support for athletes
- [ ] Platform admin panel
- [ ] React Native or PWA mobile app

---

## Session 2026-05-31 — Landing Page Refresh + Polish
- [x] Landing page simplified — athlete-only (removed disabled coach button)
- [x] Created seed script (`scripts/seed.ts`) for quick demo data
- [x] Seeded DB with group + active challenge for athlete user
- [~] New landing page design in progress — 4-cube "Gates" layout (Trainer, Coach, Challenges, Setup)

## Current Focus
**Phase 1D: Complete.** Landing page + nav polish complete. Next: Phase 1E — RTL / Hebrew.

## Session 2026-06-01 — Phase 1D: Strava Webhooks + Landing Page + Dashboard Polish
- [x] Created `src/lib/strava-webhooks.ts` — token refresh + subscription management
- [x] Created `src/services/webhook.service.ts` — activity ingest + challenge recalculation
- [x] Created `src/app/api/webhooks/strava/route.ts` — GET validation + POST event handler
- [x] Created `scripts/register-strava-webhook.ts` — CLI to register webhook with Strava
- [x] Handles activity.create, activity.update, activity.delete, and athlete deauthorization
- [~] Test with ngrok when ready

## Session 2026-06-01 — Landing Page & Navigation Polish
- [x] 4-cube landing page (`page.tsx`) — מאמן, מתאמן, אתגרים, הגדרות
- [x] Landing page is permanent home base — removed auto-redirect to dashboard
- [x] Header TriForce logo always links to "/"
- [x] Bottom nav "בית" links to "/" (main page) instead of "/dashboard"
- [x] Created `scripts/demo-setup.ts` — demo coach + athlete + sample data

## Session 2026-06-01 — Dashboard Polish
- [x] Fix LocaleProvider lint error (react-hooks/set-state-in-effect)
- [x] Empty challenge state is clickable — links to /challenges
- [x] Added `lastStravaSync` field to User model + DB
- [x] Sync service records timestamp after every sync
- [x] Created `/api/athlete/sync` — manual sync endpoint
- [x] Created `/api/athlete/me` — profile endpoint (avoids stale JWT)
- [x] Dashboard sync button performs real Strava sync (not just reload)
- [x] Dashboard shows dual timestamps: last Strava activity + last app sync
- [x] Timestamps use flex-wrap for responsive layout

## Session 2026-06-02 — Screenshots + Bug Fixes
- [x] Took screenshots of all 10 pages (landing, dashboard, activities, activity detail, challenges, challenge detail, settings, coach sign-in, coach dashboard, coach groups)
- [x] **Fix:** Activity detail page broken — rewrote to use DB API instead of Strava proxy
- [x] **Fix:** Created `/api/athlete/activities/[id]` endpoint for single activity fetch
- [x] **Fix:** Coach groups page returned 404 — created `src/app/(coach)/coach/groups/page.tsx`
- [x] **Fix:** Settings showed `settings.language` — added missing Hebrew translation key
- [x] **Fix:** Activity links were `strava_null` — changed `sourceId` from `number` to `string`
- [x] **Fix:** `formatSportType` now handles lowercase sport types
- [x] **Fix:** Added explicit `secret` to `authOptions` for JWT compatibility

## Session 2026-06-02 — Members Cube + Follow System (In Progress)
- [x] Added 5th cube "חברים" (Members) to landing page
- [x] Created `/members` page — lists all group members with avatars
- [x] Created `/api/athlete/members` API — fetches group members from DB
- [x] Updated bottom nav to 5 items (בית, חברים, היסטוריה, אתגרים, פרופיל)
- [x] Added members Hebrew translations
- [~] **Follow system** — DB schema ready (Follow model added), UI pending
  - [ ] Push Follow model to Neon DB
  - [ ] Create follow/unfollow API
  - [ ] Add follow buttons on members page
  - [ ] Create friend profile page
  - [ ] Create compare stats page
- [x] Created `scripts/take-screenshots.ts` — automated screenshot script with real UI sign-in

## Session 2026-06-05 — Friends Discovery System (Complete)
- [x] Push Follow model to Neon DB (`npx prisma db push`)
- [x] Create `/api/athlete/members/[id]/follow` — toggle follow/unfollow
- [x] Create `/api/athlete/friends` — list people you follow on TriForce
- [x] Create `/api/athlete/users/search` — search TriForce users by name
- [x] Create `/api/athlete/groups` — list athlete's groups with invite codes
- [x] Add "Add Friend" modal with search + invite link copy
- [x] **Strava Clubs discovery**: `/api/athlete/strava-clubs` + club members cross-reference
- [x] **Kudos-based discovery**: `/api/athlete/strava-kudos` — find friends who liked your activities
- [x] Update OAuth scope to `read,read_all,profile:read_all,activity:read_all`
- [x] Add retry buttons to error states (`ErrorMessage` component)
- [x] Update members page: 4 sections (My Friends, Strava Clubs, Kudos Friends, Group Members)
- [x] Full Hebrew translations for all new features
- [x] Commit + push to GitHub

## Session 2026-06-08 — Members Page Cube Redesign + RTL Polish
- [x] Strava friends endpoint research — confirmed Strava removed `/athlete/friends`, `/athlete/follows`, `/athlete/followers` from API v3
- [x] Cleaned up broken Strava friends code (removed non-existent endpoints)
- [x] Members page redesigned with cube grid matching landing page aesthetic
- [x] 2×2 cube grid: Friends (green), Clubs (orange), Kudos (gold), Group Members (purple)
- [x] Active cube highlight with white ring
- [x] Content panel below shows selected section
- [x] Removed big green header banner — page now uses light `#f8faf9` background like landing page
- [x] Centered `max-w-[420px]` container — cubes stay compact on all screen sizes
- [x] Emoji icons in cubes (🤝 🚴 👍 👥) matching landing page style
- [x] Fixed remaining CSS directional issues (`border-r` → `border-e` in CoachShell, `text-left` → `text-start` in StatCard)
- [x] Added `members` and `friends` namespaces to `en.json` (English translations complete)
- [x] Extracted hardcoded Hebrew from dashboard, landing, BottomNav, ErrorMessage
- [x] Build passes clean
- [~] Members page visual design — user feedback: needs further refinement (cubes still feel too large/unpleasant)

## Session 2026-06-08 (continued) — Compact Horizontal Tabs
- [x] Replaced big 2×2 cube grid with compact iOS-style segmented tab bar
- [x] 4 tabs: חברים, מועדונים, לייקים, חברי קבוצה
- [x] Active tab: white bg + shadow, inactive: muted gray text
- [x] Tab bar uses `rounded-xl bg-gray-100 p-1` container
- [x] Content panel stays below — no more giant visual cubes
- [x] Build passes clean, committed + pushed

## Session 2026-06-08 (continued) — Phase 1F Messages + Events
- [x] Created `src/services/message.service.ts` — sendMessage, getGroupMessages, getMessagesForUser
- [x] Created `src/services/event.service.ts` — createEvent, getGroupEvents, getUpcomingEventsForUser, deleteEvent
- [x] Created `/api/athlete/messages` — list messages from all user's groups
- [x] Created `/api/athlete/events` — list all events from user's groups
- [x] Created `/api/coach/groups/[groupId]/messages` — GET list + POST send
- [x] Created `/api/coach/groups/[groupId]/events` — GET list + POST create + DELETE
- [x] Created `/messages` athlete page — inbox with announcement + chat cards
- [x] Created `/events` athlete page — upcoming/past sections with countdown badges
- [x] Created `/coach/groups/[groupId]/messages` page — compose form + sent history
- [x] Created `/coach/groups/[groupId]/events` page — create form + all events list
- [x] Added Messages + Events quick links to coach group detail page
- [x] Bottom nav: replaced non-existent /profile with /messages (bell icon)
- [x] Added `messages` + `events` namespaces to he.json and en.json

## Session 2026-06-09–10 — Kudos Persistence + Friends Discovery Polish
- [x] Fixed Strava rate-limit vicious cycle — removed auto-scan on empty DB; scan only on `?refresh=1`
- [x] Added `isChosen` field to StravaContact model (`npx prisma db push`)
- [x] `+ בחר` / `✓ חבר שלי` toggle button on each kudos contact row
- [x] `הסר` remove button in "חברים שלי" tab
- [x] "חברים שלי" tab shows chosen kudos contacts + TriForce follows
- [x] Fixed `getQueryData` → `useQuery` (reactivity bug in MyFriendsContent)
- [x] Created `/api/athlete/strava-contacts/[contactId]` — toggle isChosen via POST
- [x] Researched Strava outgoing kudos/following — confirmed all social graph endpoints removed in 2017
- [x] Built mutual friends feature: cross-reference club members with kudos contacts by name
- [x] Created `/api/athlete/mutual-friends` — scans all clubs, builds member name set, cross-refs with StravaContacts
- [x] Added "⭐ חברים הדדיים" section at top of "חברים שלי" tab with club name sub-labels
- [x] MutualFriendRow with `+ בחר` / `✓ חבר שלי` toggle — syncs both caches (kudos + mutual)
- [x] Build passes clean

## Session 2026-06-13 — Athlete Home Rebuild (Dashboard)
- [x] New API `/api/athlete/chosen-friends` — returns StravaContacts where isChosen=true
- [x] `CoachWing.tsx` — Wing 1: group + active challenge card, or join-group CTA with invite code input
- [x] `FriendsWing.tsx` — Wing 2: chosen friends list with initials avatars + compare button
- [x] `/dashboard` page rebuilt — 2 wings + quick links (היסטוריה / אירועים / הגדרות)
- [x] `/athlete` hub page — 6 cubes (הבית שלי, חברים, אתגרים, היסטוריה, הודעות, אירועים)
- [x] Landing page "מתאמן" cube now routes to `/athlete` hub
- [x] Hebrew + English translations updated

## Session 2026-06-13 — Coach Home + Auth Guards Removed

### Coach UI rebuilt
- [x] `/coach` — rebuilt as navigation hub with 6 cubes (מתאמנים, אתגרים, הודעות, אירועים, סטטיסטיקות, קבוצות)
- [x] `/coach/stats` — stats dashboard (athlete table, 4 stat cards, bar chart, attention panel) moved here
- [x] `/api/coach/dashboard` — new API: athletes status, workouts/week, adherence %, weekly bar data, active challenge
- [x] `/coach/groups` — rebuilt in Hebrew with styled group cards showing invite code
- [x] `/coach/groups/new` — rebuilt in Hebrew with "how it works" explainer
- [x] `CoachShell` — updated to Hebrew nav + TriForce logo
- [x] Coach home cube links directly to group sub-pages when coach has exactly 1 group
- [x] `i18n/he.json` — added all coach dashboard translation keys

### Auth guards removed (temporary — re-add before launch)
- [x] `(coach)/layout.tsx` — role check removed; any authenticated user can access `/coach/*`
- [x] `(athlete)/layout.tsx` — auth check removed; any user can access athlete pages
- [x] `page.tsx` (landing) — coach cube goes directly to `/coach`, no longer routes to sign-in
- [x] `POST /api/coach/groups` — COACH role check replaced with simple auth check

## Session 2026-06-17→20 — Compare + Invite + Deploy

### Compare feature
- [x] `/compare` hub page — chosen friend cards with sport buttons (🏃 🚴 🏊)
- [x] `/compare/[contactId]` detail — side-by-side stats, two modes:
  - Mode A (TriForce DB): exact date filtering, 7 stats including pace
  - Mode B (Strava API): aggregate stats via `/athletes/{id}/stats`
- [x] `stravaAthleteId String?` field added to `StravaContact` schema
- [x] Compare button on every chosen friend row in members page
- [x] 📊 השוואה cube added to athlete hub `/athlete`
- [x] Fixed: avgPace crown was on slower runner (whoWinsHigher vs whoWinsLower)
- [x] Fixed: TanStack Query retry: false — error shows immediately on 404

### Invite system
- [x] `/invite/[userId]` — public landing page (client component, no SSR Prisma)
- [x] `/invite/[userId]/linked` — post-connect page (links account, redirects to dashboard)
- [x] `POST /api/invite/accept/[inviterId]` — links new user to inviter's contacts
- [x] `GET /api/invite/[inviterId]/info` — returns inviter name/photo (public)
- [x] Invite auto-matches by name OR creates new StravaContact with triforceUserId set
- [x] Creates mutual Follow on both sides

### WhatsApp share
- [x] "📲 שלח בווטסאפ" button on compare hub — generates wa.me link
- [x] WhatsApp button on each friend row that hasn't joined TriForce
- [x] Message: plain Hebrew text (no emojis — older phones show ? for sport emojis)
- [x] URL on its own line to prevent WhatsApp truncation

### Deployment
- [x] Deployed to Vercel: https://triforce-iota.vercel.app
- [x] Strava callback domain updated to triforce-iota.vercel.app
- [x] Strava athlete limit upgraded to 10 (Standard Tier)
- [x] DATABASE_URL fixed — was stored with surrounding quotes, now correct
- [x] מתאמן landing button fixed — now routes any authenticated user to /athlete

### Strava API findings (confirmed by testing)
- `/athlete/following`, `/activities/following` — removed/404, cannot get friends list
- `/athletes/{id}/stats` — 403 for other athletes, only works for self
- Club members DO have Strava IDs → best source for TriForce user matching
- Rate limit: 100 req/15min (Standard Tier)

## Current Focus
**History page complete.** Full Strava history synced (1,416 activities), client-side filtering, sync/filter separation explained. Next: peer challenges + activity comparison inside groups.

---

## Session 2026-06-22 — History Page + Activity Sync

### Activity sync — full history
- [x] `syncStravaActivitiesForUser`: `months=0` → no date limit (fetches entire Strava history)
- [x] Page limit raised 20→50 pages (up to 5,000 activities)
- [x] Manual sync endpoint passes `months=0` — full history on every manual sync
- [x] Auto-sync on login stays at 3 months (fast path)
- [x] Confirmed: 1,416 activities synced (was 123 before)

### History page — filters, sync button, UX
- [x] Sync button on history page (in addition to dashboard)
- [x] Last sync timestamp shown under page title
- [x] Period filter pills: 3 חודשים / חצי שנה / שנה / שנתיים / הכל / בחר...
- [x] "בחר..." reveals custom from/to date pickers
- [x] **Filters are client-side** — all activities fetched once, `useMemo` filters in memory; switching periods is instant, zero network calls
- [x] `useActivities` hook updated to support `from`/`to` date params (kept for future use)
- [x] `listActivitiesForUser` + API route support `from`/`to` filtering (DB-side, for other callers)
- [x] Count shows "X פעילויות (מתוך Y בסה"כ)" when filtered
- [x] Sync button subtitle: "מוסיף אימונים חדשים מ-Strava"
- [x] Info note above filters: explains filter uses existing DB data, no re-sync needed

---

## Session 2026-06-20→21 — Groups Overhaul + Auth Simplification

### Architectural rule added
- [x] "Scan Once, Read from DB" principle written into PLAN.md + TODO.md — applies to all future features

### Mutual friends — scan-once fix
- [x] Added `isMutual Boolean` + `mutualClubs String[]` to StravaContact schema
- [x] `/api/athlete/mutual-friends` GET reads from DB (fast); `?refresh=1` scans Strava clubs + persists
- [x] `staleTime: Infinity` on client — no auto re-scan on page load

### Phase 2A: Peer Groups + Group management
- [x] Schema: `GroupType` enum (COACH|PEER), `type` + `creatorId` added to Group
- [x] `group.service.ts` fully rewritten: createGroup (sets creatorId+type), createPeerGroup, getAllGroups, getGroupDetail (non-member safe), getNonMembers (all TriForce users), addMemberToGroup, removeMemberFromGroup, deleteGroup
- [x] `GET /api/groups` — all groups with isMember/isOwner flags per caller
- [x] `GET /api/athlete/groups/[groupId]` — open to non-members (returns basic info)
- [x] `GET /api/athlete/groups/[groupId]/non-members` — addable users for owner
- [x] `POST/DELETE /api/athlete/groups/[groupId]/members/[userId]` — owner add/remove
- [x] `GET/POST /api/athlete/groups/[groupId]/messages` — member-scoped messages
- [x] `DELETE /api/groups/[groupId]` — owner deletes group (sequential dependency-order deletes)
- [x] `GET /api/coach/groups` — added (was POST-only before)
- [x] `/groups` page: all groups, two sections, "מחק קבוצה" with inline confirm
- [x] `/groups/[groupId]`: 3-view page (non-member join | member tabs | owner picker+tabs)
- [x] `/coach/groups/[groupId]` rebuilt as interactive client component with full picker
- [x] `/coach/groups` fixed to use proper API (was fetching from dashboard endpoint)

### Auth simplification
- [x] Coach credentials sign-in/sign-up pages deleted
- [x] Landing page Coach cube → Strava login if not authenticated, /coach if logged in
- [x] Coach layout: any authenticated user (role gate deferred to pre-launch)

### Build + deployment fixes
- [x] `"build": "prisma generate && next build"` — prevents stale Prisma client on Vercel
- [x] Fixed Turbopack cache issue locally (cleared .next, regenerated Prisma client)
- [x] Group delete: switched from `$transaction` (blocked by Neon PgBouncer) to sequential awaits
- [x] Member picker: now shows all TriForce users for both group types (was filtering to chosen contacts only)

---

## Phase 2A: Peer Groups — קבוצות עמיתים

### Architecture decision (agreed, 2026-06-14)
The `Group` model will support TWO types via a single `type` field:
- `COACH` — existing: coach creates, athletes join via invite code, coach approves
- `PEER` — new: any athlete can create, invites chosen friends, more informal

Same DB model, same services, same message/challenge/event tables — just different permissions and UI per type.

### DB change
- [x] Add `type GroupType` enum (`COACH | PEER`) to `Group` model in `schema.prisma`
- [x] Add `creatorId String?` to `Group` model (who opened it)
- [x] Run `npx prisma db push`

### API changes
- [x] `POST /api/athlete/groups/create` — athlete creates a PEER group
- [x] `POST /api/athlete/groups/[groupId]/invite` — invite a chosen friend to peer group
- [x] `GET /api/athlete/groups/[groupId]` — group detail (works for both types)
- [x] `GET/POST /api/athlete/groups/[groupId]/messages` — member-accessible messages (PEER: any member can post; COACH: read-only)
- [x] Update `GET /api/athlete/groups` — return both COACH and PEER groups

### Features inside a PEER group (same as COACH group, different roles)
- [x] Messaging (chat between members — PEER: any member can send; COACH: read-only)
- [x] Group creator can add/remove members (direct picker — no invite code needed)
- [ ] Encouragement / likes on messages
- [ ] Activity comparison between members
- [ ] Peer challenges (sport / metric / goal / duration)
- [ ] Virtual trophy / achievement scoring

### UI — Athlete side
- [x] "קבוצות" cube added to `/athlete` hub → `/groups`
- [x] `/groups` page — all groups visible; owned/member groups + others with join; delete with confirm
- [x] `/groups/[groupId]` — permission-aware: owner sees picker + remove buttons; member sees read tabs; non-member sees join form
- [x] Group page tabs: חברים | הודעות | אתגרים
- [x] Member picker shows ALL TriForce users not in group (both COACH and PEER)
- [x] Group delete: sequential deletes in dependency order (avoids Neon transaction issues)

### UI — Coach side
- [x] `/coach/groups/[groupId]` rebuilt as interactive client component
- [x] Coach sees: current members with "הסר" buttons + full picker of all TriForce users not in group
- [x] `/coach/groups` page fixed to use proper API endpoint (was using dashboard endpoint)

### Build order
1. Schema change + DB push
2. API: create peer group + invite friends
3. Shared group detail page (works for both types)
4. Messaging in peer group
5. Activity comparison tab
6. Peer challenges
7. Achievements / virtual trophies

### After peer groups
- `/compare/[contactId]` — standalone head-to-head stats (no group needed)
- `FriendChallenge` model — 1v1 peer challenge
- Friend invitation — if contact not on TriForce, show invite link

### Architecture principle
- User has TWO parallel contexts: coach group (structured) + peer group (informal)
- Strava contacts NOT on TriForce → show "הזמן ל-TriForce" instead of features
- `StravaContact.isChosen = true` = pool of friends to invite to peer groups

---

## Current Focus — KIMI Unified Challenges Redesign (2026-06-23)

> **Design Assistant:** This implementation plan was prepared with **KIMI** (Kimi Code CLI). The key model for this phase is KIMI.

### Phase 3: Unified Challenges System

Goal: one challenge model for coaches and trainees, with sport-specific, age/gender-adjusted scoring, explicit invitations, and rich comparison analytics.

#### Stage 1 — Schema & Migration
- [ ] Update `Challenge` model: add `createdById`, `sportType`, `distanceKm`, `metric`, `targetValue`, `targetUnit`, `tolerancePercent`, `bonusFactor`, `penaltyFactor`; make `groupId` optional.
- [ ] Update `ChallengeEntry` model: add `status`, `invitedAt`, `respondedAt`, `completedAt`, `actualPace`, `expectedPace`, `tolerancePace`, `progressValue`.
- [ ] Update `ChallengeActivityLink`: add `value`, `isBest`.
- [ ] Create `SportReferencePace` model.
- [ ] Create `Notification` model.
- [ ] Add `User.createdChallenges` relation.
- [ ] Add performance indexes.
- [ ] Run `npx prisma db push` against Neon.

#### Stage 2 — Reference Data
- [ ] Build running pace table for ages 10–80, genders M/F, distances 5K / 10K / half marathon / marathon.
- [ ] Decide data source (WMA-derived, public statistics, or custom table).
- [ ] Create seed script `scripts/seed-reference-pace.ts`.
- [ ] Run seed in dev and production.

#### Stage 3 — Scoring Engine
- [ ] Implement `calculateChallengeScore(age, gender, distanceKm, actualPace, tolerancePercent, bonusFactor, penaltyFactor)`.
- [ ] Handle edge cases: missing DOB/gender, no qualifying activity, tie breaking.
- [ ] Add unit tests for score calculation.

#### Stage 4 — Challenge Lifecycle API
- [ ] `POST /api/challenges` — create challenge + invitations.
- [ ] `GET /api/challenges` — list my challenges.
- [ ] `GET /api/challenges/[id]` — detail + leaderboard.
- [ ] `PATCH /api/challenges/[id]` — edit before start.
- [ ] `DELETE /api/challenges/[id]` — cancel/delete.
- [ ] `POST /api/challenges/[id]/accept` — accept invitation.
- [ ] `POST /api/challenges/[id]/decline` — decline invitation.
- [ ] `POST /api/challenges/[id]/remind` — remind pending invitees.

#### Stage 5 — Notifications
- [ ] Send `CHALLENGE_INVITED` notification to each recipient.
- [ ] Send `CHALLENGE_ACCEPTED` / `CHALLENGE_DECLINED` notification to creator.
- [ ] Send `CHALLENGE_COMPLETED` notification when participant reaches goal.
- [ ] Build notifications API and unread badge.

#### Stage 6 — Activity Integration
- [ ] On activity sync (manual + webhook), evaluate active challenges for the user.
- [ ] Create/update `ChallengeActivityLink` for qualifying activities.
- [ ] Update `ChallengeEntry` with best attempt and score.
- [ ] Recalculate leaderboard.

#### Stage 7 — UI Components
- [ ] `ChallengeForm` — sport, distance, dates, tolerance, participant picker.
- [ ] `ReferenceTableModal` — colorful Hebrew explanation table.
- [ ] `ChallengeInbox` — pending invitations with accept/decline.
- [ ] `ChallengeDetail` — leaderboard + my result + reference table.
- [ ] `ChallengeParticipantPicker` — coach version (groups/individuals) and trainee version (friends).
- [ ] Add challenge creation entry points: coach hub, athlete hub, friends page, group detail tab.

#### Stage 8 — Testing & Polish
- [ ] Test coach → team flow with demo data.
- [ ] Test trainee → friends flow.
- [ ] Test accept/decline notifications.
- [ ] Test scoring with users of different ages/genders.
- [ ] Add empty, loading, and error states.
- [ ] Update screenshots.
- [ ] Run `npm run build` clean.

### Deferred
- [ ] Cycling and swimming parameters.
- [ ] Prizes display on challenges.
- [ ] Advanced scoring methods integration (age-grade, category, personal improvement) inside the unified model.
- [ ] Challenge analytics dashboard.
- [ ] Materialized views for heavy leaderboards.

---

## Session 2026-06-23 — KIMI Unified Challenges Implementation (Complete)

> **Design + implementation assistant: KIMI (Kimi Code CLI).**

### Completed today
- [x] Prisma schema migration pushed to Neon (Challenge, ChallengeEntry, ChallengeActivityLink, SportReferencePace, Notification).
- [x] Backfilled 6 existing challenges with creator, sportType, distanceKm, metric.
- [x] Seeded 608 reference pace rows for running (ages 10–85, M/F, 5K/10K/half/marathon).
- [x] Built goal-based scoring engine with 30% tolerance and 0–100 score cap.
- [x] Created unified challenge API: create, list, detail, accept, decline.
- [x] Added notifications API for invites/responses.
- [x] Updated Strava webhook to score friend challenges too.
- [x] Built colorful reference table modal.
- [x] Built `/challenges/new` creation form with colored sections.
- [x] Updated `/challenges` list page and `/challenges/[id]` detail/leaderboard page.
- [x] Updated `/friends` page to read kudos contacts from DB (fast) with explicit refresh.
- [x] Linked challenge creation to chosen friends (`isChosen=true` Strava contacts).
- [x] Created `scripts/setup-demo-friends.ts` and ran it — all demo users now follow each other and are chosen contacts.
- [x] Build passes clean.

### Current state
- App runs at `http://localhost:3000`.
- Demo users can create challenges, invite demo friends, accept, and see leaderboards.
- Score calculation verified with test activity.

### Next (tomorrow)
- Polish entry points (coach hub, athlete hub, group detail challenges tab).
- Add notifications badge in navigation.
- Extract Hebrew strings to `i18n/he.json`.
- Replace KIMI-derived reference pace table with real amateur-average data from online source.
- UI/UX refinement based on user testing.
- Deploy to Vercel when ready.


---

## Coach Cube Audit & Repair (2026-06-26)

### Preparation
- [x] Read current coach hub, stats, messages, events, groups, and friends code.
- [x] Compare each cube against PLAN.md original intent.
- [x] Write audit plan into PLAN.md.
- [x] Create actionable TODO list below.

### Cube 3 — הודעות (Messages) — quick win
- [ ] Extract all English strings to `i18n/he.json` + `i18n/en.json`.
- [ ] Translate page title, form labels, placeholders, buttons, empty states.
- [ ] Translate message-type badges (ANNOUNCEMENT → הודעה, CHAT → הודעה אישית).
- [ ] Align badge colors with athlete `/messages` page.
- [ ] Add delete message action.
- [ ] Build + test locally.

### Cube 4 — אירועים (Events) — quick win
- [ ] Extract all English strings to i18n.
- [ ] Translate page title, form labels, placeholders, buttons, empty states, dates.
- [ ] Fix non-functional delete button (`CoachEventDelete`).
- [ ] Add edit event flow.
- [ ] Verify RTL date/time inputs.
- [ ] Build + test locally.

### Cube 2 — אתגרים (Challenges)
- [ ] Fix coach hub challenge link when coach has multiple groups → `/challenges/new` with group selector visible.
- [ ] Add `redirectTo` query param support on `/challenges/new` so coach returns to `/coach` or `/coach/groups/[id]` after creation.
- [ ] Audit and fix any remaining old challenge URLs (`/coach/groups/[id]/challenges/new`) across the app.
- [ ] Build + test locally.

### Cube 1 — מתאמנים (Athletes)
- [ ] Decide whether to merge Athletes + Statistics cubes or keep separate pages.
- [ ] If merged: remove Statistics cube; if separate: create dedicated `/coach/statistics` page.
- [ ] Make athlete rows in `/coach/stats` clickable → `/coach/athletes/[userId]`.
- [ ] Create `/coach/athletes/[userId]` detail page with recent activity + message button.
- [ ] Fix active-challenge card link to `/challenges/new?groupId=...`.
- [ ] Fix "pending messages" stat to count unread messages or rename it.
- [ ] Build + test locally.

### Cube 5 — סטטיסטיקות (Statistics)
- [ ] Apply merge/separate decision from Cube 1.
- [ ] Add date-range filter.
- [ ] Add per-sport activity breakdown.
- [ ] Add CSV export.
- [ ] Make weekly target configurable per group.
- [ ] Build + test locally.

### Cube 6 — קבוצות (Groups)
- [ ] Audit all challenge links in group detail page.
- [ ] Add group settings: rename + delete from `/coach/groups` list.
- [ ] Verify all hardcoded strings are i18n'd.
- [ ] Build + test locally.

### Cube 7 — חברים (Friends)
- [ ] Verify `/members` works correctly for coach users.
- [ ] Add "הזמן לקבוצה" action when navigating from coach context.
- [ ] Build + test locally.

### Final
- [ ] Full `npm run build` clean.
- [ ] Deploy to Vercel.
- [ ] Smoke-test each coach cube in production.

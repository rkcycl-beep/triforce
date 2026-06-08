# TriForce — Build Progress Tracker

## Status Legend
- [ ] Not started
- [x] Complete
- [~] In progress

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

## Phase 1B: Groups + Roles
- [x] Coach registration: add Credentials provider (email/password)
- [x] Create services/group.service.ts
- [x] Create /api/coach/groups route (create group)
- [x] Create /api/athlete/groups/join route (join via invite code)
- [x] Add role to NextAuth session
- [x] Update proxy.ts: coach routes require COACH role
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
- [ ] Create Message model routes
- [ ] Coach broadcast compose + send
- [ ] Athlete message inbox
- [ ] Personal conversation thread (athlete <-> coach)
- [ ] Unread message badges
- [ ] Create Event model routes
- [ ] Events list page (athlete)
- [ ] Events manager page (coach)
- [ ] Link challenge to event
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

## Current Focus
**Phase 1E: RTL / Hebrew — COMPLETE.** Members page now uses compact tabs. Next: Phase 1F Messages/Events polish.

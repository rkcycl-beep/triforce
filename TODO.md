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
- [ ] Verify: Strava login still works + User/Account rows appear in DB
- [~] Create services/user.service.ts (deferred — only one helper needed; inlined for now)
- [x] Create services/activity.service.ts (CRUD + upsert)
- [x] Create services/sync.service.ts (sync Strava activities to DB)
- [x] Trigger activity sync on login (jwt callback first-sign-in branch — signIn fires too early under JWT strategy)
- [x] Create /api/athlete/activities route (reads from DB)
- [x] Update useActivities hook to use new endpoint (renamed from useStravaActivities; 3 callers updated)
- [ ] Verify: dashboard shows activities from DB, not live Strava API

---

## Phase 1B: Groups + Roles
- [ ] Coach registration: add Credentials provider (email/password)
- [ ] Create services/group.service.ts
- [ ] Create /api/coach/groups route (create group)
- [ ] Create /api/athlete/groups/join route (join via invite code)
- [ ] Add role to NextAuth session
- [ ] Update proxy.ts: coach routes require COACH role
- [ ] Create coach layout with sidebar navigation
- [ ] Coach dashboard page (basic)
- [ ] Group creation form UI
- [ ] Invite code display for coach
- [ ] Athlete join flow UI (enter invite code)
- [ ] Member list page for coach

---

## Phase 1C: Challenges
- [ ] Create services/challenge.service.ts
- [ ] Create /api/coach/groups/[groupId]/challenges routes
- [ ] Create /api/athlete/challenges routes
- [ ] Challenge creation form (sport type, goals, dates, scoring method)
- [ ] Scoring engine dispatcher: lib/scoring/index.ts
- [ ] Personal Improvement scoring: lib/scoring/personal-improvement.ts
- [ ] Category scoring: lib/scoring/category.ts
- [ ] Age Grade scoring: lib/scoring/age-grade.ts
- [ ] Import WMA age-grade tables: lib/scoring/age-grade-tables.json
- [ ] Athlete challenge view with progress bars
- [ ] Leaderboard component (overall + by category)
- [ ] Challenge detail page
- [ ] Recalculate scores on new activity
- [ ] Prize display on challenge

---

## Phase 1D: Strava Webhooks
- [ ] Create /api/webhooks/strava route (GET for validation, POST for events)
- [ ] Handle activity.create event
- [ ] Handle activity.update event
- [ ] Handle activity.delete event
- [ ] Auto-ingest activity on webhook -> normalize -> persist -> score
- [ ] Register webhook subscription with Strava
- [ ] Test with ngrok (dev) or staging deployment

---

## Phase 1E: RTL / Hebrew
- [ ] Add Heebo font (Google Fonts, Hebrew + Latin subsets)
- [ ] Create LocaleProvider with RTL context
- [ ] Update root layout: dynamic lang + dir attributes
- [ ] Create i18n/he.json with all UI strings
- [ ] Create i18n/en.json (English fallback)
- [ ] Create useTranslation() hook
- [ ] Audit all components: replace pl/pr/ml/mr with ps/pe/ms/me
- [ ] Flip directional icons (arrows, chevrons) in RTL
- [ ] Update formatDate for he-IL locale
- [ ] Update formatDistance: km -> "ק"מ"
- [ ] Update formatPace for Hebrew
- [ ] Test all pages in RTL

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

## Current Focus
**Phase 1A: Database Foundation** — code complete; awaiting end-to-end runtime verification (sign in via Strava, confirm Activity rows appear in Neon, confirm dashboard hits `/api/athlete/activities` not `/api/strava/activities`). Once verified: delete `/api/strava/activities` and start Phase 1B (Groups + Roles).

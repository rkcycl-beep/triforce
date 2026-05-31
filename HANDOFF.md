# TriForce — Handoff / Session Progress

**Date:** 2026-05-31
**Branch:** `main`
**Last commit:** Phase 1C complete + landing page refresh in progress

---

## What was done this session

### Landing Page Refresh (In Progress)
- Simplified landing page (`src/app/page.tsx`) — removed disabled coach button, now athlete-only with single "Connect with Strava" CTA
- Created HTML mockup (`public/mockup-landing.html`) for visual approval
- **New design proposal:** 2×2 grid of 4 "Gate Cubes" — Trainer, Coach, Challenges, Setup
  - Each cube is a square card with distinct color gradient
  - Hover lift effect with enhanced shadows
  - Mobile-responsive (stacks vertically on small screens)

### DB Seeding
- Created `scripts/seed.ts` — reusable Prisma seed script
- Seeded demo data for active athlete user:
  - Group: "קבוצת האימונים שלי"
  - Challenge: "אתגר ריצת 40 ק\"מ" (ACTIVE, Personal Improvement scoring)
  - GroupMembership linking athlete to group

---

## Prior Sessions Summary

### Phase 1A — Database Foundation ✅
- Prisma + Neon PostgreSQL wired up (`src/lib/prisma.ts`)
- `@next-auth/prisma-adapter` added to NextAuth config
- Activity sync on login (jwt callback first-sign-in branch)
- `/api/athlete/activities` reads from DB; `useActivities` hook updated

**Key fix:** After `git pull`, always run `npm install` then `npx prisma db push` then `npx prisma generate` or the DB and generated client will be out of sync.

### Phase 1B — Groups + Roles ✅
- Coach registration via Credentials provider (email/password, bcryptjs)
- `src/services/group.service.ts` — createGroup (generates unique 6-char invite code), getGroupsByCoach, getGroupWithMembers, joinGroupByCode
- `/api/coach/groups` (POST — create group)
- `/api/athlete/groups/join` (POST — join by invite code)
- Coach layout with sidebar (`CoachShell`), role guard in `(coach)/layout.tsx` via `getServerSession`
- Coach dashboard, group creation form, invite code display (`CopyInviteCode.tsx`)
- Athlete join flow in `/settings` page

**Coach test account:** `coach@test.com` / `password123`

### Phase 1C — Challenges ✅ (verified end-to-end)
- `src/services/challenge.service.ts` — createChallenge, getChallengesByGroup, getAthleteChallenges, computeLeaderboard (pull model), getChallengeForCoach, updateChallengeStatus
- Scoring engine:
  - `src/lib/scoring/index.ts` — dispatcher
  - `src/lib/scoring/age-grade.ts` — WMA 2015 tables, linear age-factor interpolation
  - `src/lib/scoring/personal-improvement.ts` — % vs baseline window
  - `src/lib/scoring/category.ts` — age/sex category grouping
  - `src/lib/scoring/age-grade-tables.json` — WMA world records + age factors
- API routes:
  - `GET/POST /api/coach/groups/[groupId]/challenges`
  - `GET /api/athlete/challenges`
  - `GET /api/athlete/challenges/[challengeId]`
- UI:
  - Coach: `(coach)/coach/groups/[groupId]/challenges/new/page.tsx` — sport type chips, date pickers, scoring method radios + method-specific config
  - Athlete: `(athlete)/challenges/page.tsx` — list with status badges, rank, score
  - Athlete: `(athlete)/challenges/[challengeId]/page.tsx` — own score card + full leaderboard
- `BottomNav.tsx` — added 4th "Challenges" tab
- `proxy.ts` — added `/challenges` to protectedPaths

---

## Current state of the DB

There are test challenges from verification runs, plus a seeded group/challenge for the athlete user. The athlete user (Strava OAuth) is linked to the seeded group. Clean up with `npx prisma studio` before a real demo if desired.

---

## What's next

### Phase 1D — Strava Webhooks (START HERE)

From `TODO.md`:
```
- [ ] Create /api/webhooks/strava route (GET for validation, POST for events)
- [ ] Handle activity.create event
- [ ] Handle activity.update event
- [ ] Handle activity.delete event
- [ ] Auto-ingest activity on webhook -> normalize -> persist -> score
- [ ] Register webhook subscription with Strava
- [ ] Test with ngrok (dev) or staging deployment
```

**How it works:**
1. Strava sends a `GET /api/webhooks/strava?hub.challenge=xxx&hub.verify_token=yyy` to validate — respond with `{ "hub.challenge": xxx }`
2. Strava sends `POST /api/webhooks/strava` with event body like:
   ```json
   { "object_type": "activity", "aspect_type": "create", "object_id": 123456, "owner_id": 789 }
   ```
3. On `activity.create`: look up User by `providerAccountId = owner_id` (Strava athlete ID), fetch activity from Strava API, normalize + upsert to DB, trigger `computeLeaderboard` for all active challenges the user is in
4. On `activity.update`: re-fetch and re-upsert
5. On `activity.delete`: mark `isDuplicate = true` or delete the Activity row

**Key files to look at:**
- `src/services/activity.service.ts` — upsertActivity, syncActivities (for reference)
- `src/services/sync.service.ts` — syncStravaActivities (single user full sync)
- `src/lib/strava.ts` — fetchActivity(accessToken, activityId), refreshTokens
- `src/lib/normalizers.ts` — normalizeStravaActivity
- `src/lib/auth.ts` — how tokens are stored in ProviderAccount

**Webhook registration** (one-time, do after route is deployed or ngrok is running):
```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -d client_id=YOUR_CLIENT_ID \
  -d client_secret=YOUR_CLIENT_SECRET \
  -d callback_url=https://YOUR_NGROK_URL/api/webhooks/strava \
  -d verify_token=YOUR_VERIFY_TOKEN
```
Store `STRAVA_WEBHOOK_VERIFY_TOKEN` in `.env.local`.

### Landing Page — 4-Cube Design (In Progress)

Mockup: `public/mockup-landing.html`
- 2×2 grid of equal square cubes: Trainer (green), Coach (slate), Challenges (orange), Setup (blue)
- Each cube lifts on hover with shadow enhancement
- Need to implement in React (`src/app/page.tsx`) once approved

---

## Architecture reminders

| Thing | Location | Notes |
|---|---|---|
| NextAuth config | `src/lib/auth.ts` | JWT strategy; Strava + Credentials providers |
| Prisma client | `src/lib/prisma.ts` | Singleton |
| Route protection | `src/proxy.ts` | Cookie check only; role check in layout.tsx |
| Coach role guard | `src/app/(coach)/layout.tsx` | getServerSession → redirect if not COACH |
| Scoring dispatcher | `src/lib/scoring/index.ts` | calls age-grade / PI / category by scoringMethod |
| Activity upsert | `src/services/activity.service.ts` | upsertActivity(userId, activity) |
| Seed script | `scripts/seed.ts` | Run with `npx tsx scripts/seed.ts` |

## Important: Next.js 16 conventions
- Route protection file is `src/proxy.ts` (exports named `proxy` + `config`) — NOT `middleware.ts`
- Cannot call `getToken()` in proxy.ts (causes "Router action dispatched before initialization")
- Role-based guards must use `getServerSession` in server-component layouts

## Commands to run after pulling in a new instance
```bash
npm install           # in case new packages were added
npx prisma generate   # regenerate client
npm run dev           # start dev server
```

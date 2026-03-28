# TriForce — Claude Code Project Briefing

> This file is the single source of truth for the TriForce project.
> Claude Code should read this before doing anything else.

---

## What Is TriForce?

TriForce is a **sports team challenge platform** for multisport athletes — primarily triathletes, runners, cyclists, and swimmers. It connects coaches with their training groups and makes group challenges trackable, fair, and automatic.

### Core Value Proposition
- Coaches create **time-bound challenges** (e.g. "most km run this week", "highest training load", "best avg pace on 10km")
- Athletes connect their **Garmin or Strava** devices — activity data syncs automatically, no manual entry
- Scores are normalized using **Age Grade Score (AGS)** so a 55-year-old and a 25-year-old can compete fairly in the same group
- Everything is **multi-tenant**: each coaching group is isolated, with its own coach, athletes, and challenge calendar

### Initial Deployment
- ~40 athletes, 1 coaching group, based in Yavne, Israel
- Target: 500+ athletes across multiple groups within 12 months

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend + API | **Next.js 14** (App Router) | SSR + API routes in one repo |
| Language | **TypeScript** | Strict mode |
| Styling | **Tailwind CSS** | Mobile-first |
| Database | **Supabase** (PostgreSQL) | Auth + realtime + storage |
| ORM | **Prisma** | Type-safe DB access |
| Deployment | **Vercel** | Auto-deploys from `main` branch |
| PWA | **next-pwa** | Service worker, offline shell, installable |
| Auth | **Supabase Auth** + OAuth | Strava OAuth for athletes |

---

## Strava API Credentials

- **Client ID:** `214636`
- **Client Secret:** stored in `.env.local` as `STRAVA_CLIENT_SECRET` (never commit this)
- **OAuth Scopes needed:** `activity:read_all,profile:read_all`
- **Dev Callback URL:** `http://localhost:3000/api/auth/strava/callback`
- **Prod Callback URL:** `https://<your-vercel-domain>/api/auth/strava/callback`
- **Strava API Settings page:** https://www.strava.com/settings/api

### Strava OAuth Flow
1. User clicks "Connect Strava" → redirect to `https://www.strava.com/oauth/authorize?client_id=214636&response_type=code&redirect_uri=<callback>&scope=activity:read_all,profile:read_all`
2. User approves → Strava redirects to callback with `?code=...`
3. Exchange code for tokens via `POST https://www.strava.com/oauth/token`
4. Store `access_token`, `refresh_token`, `expires_at` in Supabase for the athlete
5. Use refresh token to get new access tokens when expired

---

## Garmin API

- Garmin developer access is **approval-based** (2–4 week process)
- Application already submitted / in progress
- Garmin APIs needed: **Activity API** + **Health API**
- Build with Strava first; add Garmin after approval

---

## Database Schema (Supabase / Prisma)

```
User
  id, email, name, role (coach | athlete), strava_id,
  strava_access_token, strava_refresh_token, strava_token_expires_at,
  date_of_birth, gender, created_at

Group
  id, name, coach_id (→ User), created_at

GroupMembership
  id, group_id (→ Group), athlete_id (→ User), joined_at

Challenge
  id, group_id (→ Group), title, description,
  type (distance | time | training_load | pace | steps | sleep),
  sport (run | ride | swim | all),
  start_date, end_date, created_by (→ User), created_at

ChallengeEntry
  id, challenge_id (→ Challenge), athlete_id (→ User),
  raw_value (float), age_grade_score (float),
  strava_activity_id, recorded_at

Activity
  id, athlete_id (→ User), strava_id (unique),
  sport_type, distance_m, duration_s, avg_pace,
  avg_hr, calories, recorded_at, raw_json
```

---

## Age Grade Score (AGS)

AGS normalizes performance across age and gender using World Athletics / WMA tables.

```
AGS = (age_group_world_record_for_distance / athlete_time) × 100
```

- Store lookup tables in the DB or as a JSON file
- Calculate on activity sync, store in `ChallengeEntry.age_grade_score`
- For non-running sports, use equivalent normalization (cycling watts/kg, swim pace)

---

## App Pages & Routes

```
/ (landing)               — marketing page, "Join TriForce" CTA
/login                    — email/password + "Connect with Strava"
/dashboard                — athlete: my challenges, recent activities, leaderboard
/coach                    — coach: manage groups, create challenges, view all athletes
/challenges/[id]          — challenge detail: leaderboard, my progress, time remaining
/athletes/[id]            — athlete profile: stats, badges, history
/connect/strava           — OAuth initiation redirect
/api/auth/strava/callback — OAuth callback handler
/api/strava/webhook       — Strava webhook for real-time activity sync
/api/cron/refresh-tokens  — refresh expiring Strava tokens (Vercel cron)
/api/cron/sync-activities — manual/scheduled activity pull
```

---

## Key Features (Priority Order)

### Phase 1 — MVP (build this first)
1. Strava OAuth connect + activity sync
2. Coach creates a challenge (sport, metric, date range)
3. Leaderboard with AGS scoring
4. Athlete dashboard (my rank, progress bar, recent activities)
5. Mobile-first UI, PWA installable

### Phase 2
6. Push notifications (challenge starting, leaderboard change)
7. Badges & achievements
8. Multi-group support (athlete in multiple groups)
9. Garmin integration (after API approval)

### Phase 3
10. Public challenge sharing
11. Coach analytics dashboard
12. Subscription / payments (Stripe)

---

## Environment Variables

Create `.env.local` with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Strava
NEXT_PUBLIC_STRAVA_CLIENT_ID=214636
STRAVA_CLIENT_SECRET=           # from strava.com/settings/api → Show
STRAVA_WEBHOOK_VERIFY_TOKEN=    # any random string you choose

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000   # change to Vercel URL after deploy
```

---

## PWA Requirements

- `public/manifest.json` with name, icons, theme_color `#085041`, background_color `#ffffff`
- Service worker via `next-pwa` (cache app shell, offline fallback page)
- iOS meta tags (`apple-mobile-web-app-capable`, splash screens)
- 192×192 and 512×512 icons (use the TriForce triangle logo, green on dark green)
- `viewport` meta set to `width=device-width, initial-scale=1`

---

## Brand / Design

- **Primary:** `#085041` (dark green)
- **Accent:** `#1D9E75` (teal green)
- **Background:** `#f7f9f7`
- **Font:** Inter (Google Fonts)
- **Logo concept:** Three interlocking triangles (triforce symbol) in teal on dark green
- Tone: athletic, clean, minimal — like Strava meets Notion

---

## Git / Workflow

- Repo: `https://github.com/rkcycl-beep/triforce`
- Default branch: `main`
- Vercel deploys automatically from `main`
- Never commit `.env.local` or any secrets

---

## What Has Been Done So Far

- [x] Strava API application created (Client ID: 214636)
- [x] Privacy policy page (`triforce-privacy-policy.html`)
- [x] Garmin developer application document (`garmin-application.html`)
- [x] Project briefing written (this file)
- [ ] Next.js app scaffolded
- [ ] Supabase project created
- [ ] Deployed to Vercel
- [ ] PWA configured
- [ ] Strava OAuth working end-to-end

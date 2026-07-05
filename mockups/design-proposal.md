# TriForce — Role-First Entry Gate: Design Proposal

## Core change

Move from a **single app with fluid role switching** to **two distinct in-app systems** chosen at the entry gate.

- When a user first enters after login, they land on the **Entry Gate** and choose: **מתאמן** or **מאמן**.
- The choice determines the entire navigation shell, menu, pages, and available features for that session.
- A user may still have both capabilities in the database, but switching between them requires returning to the Entry Gate (effectively a new session choice).

---

## Why this makes sense

| Current model | Proposed model |
|---------------|----------------|
| One menu mixes coach and athlete cubes; user can accidentally enter the wrong context | Each system has a coherent mental model: “I came here to train” vs “I came here to coach” |
| `/coach` and `/athlete` coexist in the same navigation | Only one navigation exists per session |
| Same landing page tries to serve both audiences | Landing page is replaced by a clear role selector |
| Harder to permission-gate because flows interleave | Permission model becomes simple: `selectedRole` cookie/session value |

---

## Entry Gate flow

```
Login with Strava
       │
       ▼
┌─────────────────────┐
│    TriForce Gate    │
│                     │
│  🏃 אני מתאמן       │
│  📋 אני מאמן        │
└─────────────────────┘
       │
   ┌───┴───┐
   ▼       ▼
Athlete  Coach
System   System
```

### Gate rules

1. **No default** — the user must actively choose.
2. **Persist the choice** in an HTTP-only cookie or session value: `triforce_role=athlete|coach`.
3. **All route guards read this cookie** to decide which layout to render and which routes to allow.
4. **Switching is only possible from the gate** — inside the app there is no “switch to coach” button. The user exits to the gate and re-enters.
5. **One user, two records** — the same Strava account can create both an athlete profile and a coach profile; the role cookie only decides which profile is active now.

---

## Two systems

### Athlete System

- Entry point: `/athlete` hub
- Navigation: athlete bottom nav (בית / חברים / היסטוריה / אתגרים / פרופיל)
- Features: my dashboard, friends, challenges, history, messages, events, groups, compare
- Visual identity: green primary color

### Coach System

- Entry point: `/coach` hub
- Navigation: coach bottom nav or sidebar (בית / מתאמנים / אתגרים / קבוצות / הגדרות)
- Features: athletes, challenges, messages, events, statistics, groups, friends
- Visual identity: blue primary color

---

## Routing changes

| Current | Proposed |
|---------|----------|
| `/` landing page with mixed cubes | `/` redirects unauthenticated to login; authenticated redirects to `/gate` |
| `/gate` (new) | Role selector |
| `/athlete` | Athlete hub |
| `/coach` | Coach hub |
| Athlete can navigate to `/coach` | Blocked by guard unless gate selected coach |
| Coach can navigate to `/athlete` | Blocked by guard unless gate selected athlete |

### Guard logic

```ts
// pseudo-code
const role = getCookie('triforce_role'); // 'athlete' | 'coach'

if (pathname.startsWith('/athlete') && role !== 'athlete') redirect('/gate');
if (pathname.startsWith('/coach') && role !== 'coach') redirect('/gate');
```

---

## Data model implications

- **User model already supports multi-role** via `roles String[]`.
- We can keep that, but the active role is determined by the gate cookie, not by the user record.
- If a user has never chosen coach, the coach system may show an onboarding CTA (“הפוך למאמן”) which elevates the user record and then sends them back to the gate.

---

## Files to change (high-level)

1. **New file:** `src/app/gate/page.tsx` — role selector UI
2. **New file:** `src/app/gate/layout.tsx` — clean layout, no shell
3. **Modify:** `src/proxy.ts` — add role-cookie checks
4. **Modify:** `src/app/page.tsx` — authenticated users go to `/gate`
5. **Modify:** `src/lib/auth.ts` — on first login, redirect to `/gate` instead of `/`
6. **Modify:** `src/app/(athlete)/layout.tsx` and `src/app/(coach)/layout.tsx` — enforce role cookie
7. **Modify:** `src/components/layout/BottomNav.tsx` — role-specific nav items
8. **Modify:** `src/components/layout/Header.tsx` — remove cross-role links; add back-to-gate only if needed

---

## Open questions

1. Should the gate appear **every time the user opens the app**, or only after logout?
   - Recommendation: store last selected role and redirect automatically, but show a “switch role” option in settings.
   - But if the user explicitly wants to choose every time, we can skip auto-redirect.
2. Should the URL be `/gate` or should the role selector be the landing page `/` for authenticated users?
3. Do we keep the current landing page cubes for marketing/public visitors, or replace it entirely?

---

## Next step

Review the three HTML mockups in this folder. Once approved, I will implement the gate page, the routing guards, and the role-scoped navigation.

# TriForce — Deploy to Vercel

## Prerequisites
- Node.js 18+ installed locally
- Git installed
- Vercel account (free at vercel.com)
- Supabase project created (free at supabase.com)
- Strava API app created (Client ID: 214636)

---

## Step 1 — Install dependencies locally
```bash
npm install
npx prisma generate
```

## Step 2 — Set up Supabase
1. Go to supabase.com → New Project
2. Copy your project URL and keys into `.env.local` (see `.env.local.example`)
3. Run database migration:
   ```bash
   npx prisma db push
   ```

## Step 3 — Test locally
```bash
cp .env.local.example .env.local
# Fill in all values in .env.local
npm run dev
```
Open http://localhost:3000 — you should see the TriForce landing page.

## Step 4 — Push to GitHub
```bash
git add .
git commit -m "feat: initial Next.js app with Strava OAuth and PWA"
git push origin main
```

## Step 5 — Deploy to Vercel
1. Go to vercel.com → New Project
2. Import from GitHub → select `rkcycl-beep/triforce`
3. Add all environment variables (copy from your `.env.local`)
4. Click Deploy

## Step 6 — Update env vars with Vercel domain
After first deploy, copy your Vercel URL (e.g. `https://triforce-abc.vercel.app`):
1. Go to Vercel → Project → Settings → Environment Variables
2. Update `NEXT_PUBLIC_APP_URL` to your Vercel URL
3. Redeploy (push a commit or click Redeploy in Vercel)

## Step 7 — Update Strava callback URL
1. Go to strava.com/settings/api
2. Click Edit
3. Change "Authorization Callback Domain" to your Vercel domain (e.g. `triforce-abc.vercel.app`)
4. Save

## Step 8 — Add PWA icons
Replace the placeholder icons in `public/icons/` with real 192×192 and 512×512 PNG files.
You can use the `triforce_icon.png` from the repo as a base.

## Step 9 — Register Strava webhook (optional, for real-time sync)
```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=214636 \
  -F client_secret=YOUR_SECRET \
  -F callback_url=https://YOUR_VERCEL_URL/api/strava/webhook \
  -F verify_token=triforce_webhook_secret_change_me
```

---

## Checklist
- [ ] `npm run build` passes with no errors
- [ ] Deployed to Vercel
- [ ] Environment variables set in Vercel
- [ ] Strava callback domain updated
- [ ] PWA icons added
- [ ] App loads on mobile
- [ ] "Connect with Strava" OAuth flow works end-to-end

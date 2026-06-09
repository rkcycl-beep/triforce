import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const account = await prisma.account.findFirst({
    where: { provider: "strava" },
    select: { access_token: true, expires_at: true, refresh_token: true, providerAccountId: true },
  });
  if (!account?.access_token) { console.error("No account"); process.exit(1); }

  let token = account.access_token;

  if (account.expires_at && Date.now() >= account.expires_at * 1000) {
    console.log("Refreshing token...");
    const r = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: account.refresh_token,
      }),
    });
    const d = await r.json() as { access_token: string };
    token = d.access_token;
  }

  for (const [label, months] of [["1m", 1], ["2m", 2], ["3m", 3]] as [string, number][]) {
    const after = Math.floor((Date.now() - months * 30 * 24 * 60 * 60 * 1000) / 1000);
    const afterDate = new Date(after * 1000).toISOString().split("T")[0];

    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?page=1&per_page=30&after=${after}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const raw = await res.json();
    const activities = Array.isArray(raw) ? raw as Array<{ id: number; kudos_count: number; name: string }> : [];

    const withKudos = activities.filter((a) => a.kudos_count > 0);
    console.log(`\n[${label}] after=${afterDate}  activities=${activities.length}  withKudos=${withKudos.length}`);
    if (!Array.isArray(raw)) console.log("  ⚠️  Strava returned:", JSON.stringify(raw));
    else activities.slice(0, 3).forEach((a) => console.log(`  · ${a.name} kudos=${a.kudos_count}`));
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

/**
 * Test script: directly calls Strava kudos API to diagnose what's returned.
 * Run with: npx tsx scripts/test-kudos.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Get the first Strava account in the DB
  const account = await prisma.account.findFirst({
    where: { provider: "strava" },
    select: {
      providerAccountId: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
      user: { select: { id: true, name: true } },
    },
  });

  if (!account?.access_token) {
    console.error("No Strava account found in DB");
    process.exit(1);
  }

  console.log(`\nUser: ${account.user.name} (Strava ID: ${account.providerAccountId})`);

  let token = account.access_token;

  // Refresh if expired
  if (account.expires_at && Date.now() >= account.expires_at * 1000) {
    console.log("Token expired — refreshing...");
    const res = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: account.refresh_token,
      }),
    });
    const data = await res.json() as { access_token: string };
    token = data.access_token;
    console.log("Token refreshed OK");
  }

  // Fetch first page of activities
  console.log("\n--- Fetching activities (page 1, 30 per page) ---");
  const activitiesRes = await fetch(
    "https://www.strava.com/api/v3/athlete/activities?page=1&per_page=30",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const activities = await activitiesRes.json() as Array<{
    id: number; name: string; kudos_count: number; visibility: string;
  }>;

  const withKudos = activities.filter((a) => a.kudos_count > 0);
  console.log(`Total fetched: ${activities.length}, with kudos: ${withKudos.length}`);

  if (withKudos.length === 0) {
    console.log("No activities with kudos on page 1. Try fetching more pages.");
    process.exit(0);
  }

  // Print raw JSON of first kudoer to verify field names
  const firstActivity = withKudos[0];
  const rawRes = await fetch(
    `https://www.strava.com/api/v3/activities/${firstActivity.id}/kudos?page=1&per_page=30`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const rawKudos = await rawRes.json() as unknown[];
  console.log("\n--- Raw JSON of first kudoer (to verify field names) ---");
  console.log(JSON.stringify(rawKudos[0], null, 2));
  console.log(`Total returned for activity ${firstActivity.id}:`, rawKudos.length);

  // Test kudos endpoint for each activity with kudos (first 10)
  console.log("\n--- Testing kudos endpoint per activity ---");
  console.log(
    "Activity ID".padEnd(14) +
    "kudos_count".padEnd(13) +
    "returned".padEnd(10) +
    "visibility".padEnd(14) +
    "names"
  );
  console.log("-".repeat(80));

  for (const activity of withKudos.slice(0, 10)) {
    const kudosRes = await fetch(
      `https://www.strava.com/api/v3/activities/${activity.id}/kudos?page=1&per_page=30`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const kudos = await kudosRes.json() as Array<{ firstname: string; lastname: string }>;
    const names = Array.isArray(kudos) ? kudos.map((k) => `${k.firstname} ${k.lastname}`.trim()).join(", ") : String(kudos);
    const returned = Array.isArray(kudos) ? kudos.length : "ERR";

    console.log(
      String(activity.id).padEnd(14) +
      String(activity.kudos_count).padEnd(13) +
      String(returned).padEnd(10) +
      (activity.visibility || "?").padEnd(14) +
      names
    );

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log("\nDone.");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

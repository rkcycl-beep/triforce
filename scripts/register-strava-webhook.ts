/**
 * Register (or re-register) a Strava webhook subscription.
 *
 * Usage:
 *   npx tsx scripts/register-strava-webhook.ts <callback-url>
 *
 * Local development example:
 *   1. npm install -g ngrok
 *   2. ngrok http 3000
 *   3. npx tsx scripts/register-strava-webhook.ts https://<id>.ngrok.io/api/webhooks/strava
 */

import {
  registerStravaWebhook,
  listStravaWebhooks,
  deleteStravaWebhook,
} from "@/lib/strava-webhooks";

async function main() {
  const callbackUrl = process.argv[2];

  if (!callbackUrl) {
    console.error("Usage: npx tsx scripts/register-strava-webhook.ts <callback-url>");
    console.error("");
    console.error("For local development, use ngrok:");
    console.error("  1. npm install -g ngrok");
    console.error("  2. ngrok http 3000");
    console.error(
      "  3. npx tsx scripts/register-strava-webhook.ts https://<id>.ngrok.io/api/webhooks/strava"
    );
    process.exit(1);
  }

  const verifyToken = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;
  if (!verifyToken) {
    console.error("STRAVA_WEBHOOK_VERIFY_TOKEN is not set in environment");
    process.exit(1);
  }

  console.log("Current subscriptions:");
  const existing = await listStravaWebhooks();
  console.log(existing);

  // Clean up existing subscriptions pointing to the same URL to avoid duplicates
  for (const sub of existing) {
    if (sub.callback_url === callbackUrl) {
      console.log(`Deleting existing subscription ${sub.id} for ${callbackUrl}`);
      await deleteStravaWebhook(sub.id);
    }
  }

  console.log(`\nRegistering new webhook: ${callbackUrl}`);
  const result = await registerStravaWebhook(callbackUrl, verifyToken);
  console.log("Success:", result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * /api/webhooks/strava
 *
 * GET  — Webhook validation (Strava sends this when registering)
 * POST — Receive webhook events
 */

import { NextRequest, NextResponse } from "next/server";
import {
  processWebhookEvent,
  type StravaWebhookEvent,
} from "@/services/webhook.service";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    console.log("[webhook] Subscription validated");
    return NextResponse.json({ "hub.challenge": challenge });
  }

  console.error("[webhook] Validation failed", { mode, token });
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const event = (await request.json()) as StravaWebhookEvent;
    console.log("[webhook] Received event:", event);

    // Await processing so the activity is persisted and challenge scores are
    // recalculated before Strava receives the 200 acknowledgment. Strava may
    // retry if this takes longer than ~2 seconds, but upsert/scoring is
    // idempotent so retries are safe. For very high traffic, move to a queue.
    await processWebhookEvent(event);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[webhook] Failed to parse event:", error);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

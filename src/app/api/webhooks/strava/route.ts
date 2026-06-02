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

    // Process asynchronously so we return 200 quickly.
    // Strava retries if we don't respond within ~2 seconds.
    // NOTE: On serverless platforms (Vercel) the async work may be cut short
    // after the response is sent. For high-reliability production use a
    // queue (Inngest, QStash, etc.). For MVP / self-hosted this is fine.
    processWebhookEvent(event).catch((err) => {
      console.error("[webhook] Async processing error:", err);
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[webhook] Failed to parse event:", error);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

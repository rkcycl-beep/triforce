/**
 * strava-webhooks.ts — Helpers for Strava webhook operations.
 *
 * Includes:
 * - Refreshing access tokens (updates DB Account row)
 * - Fetching detailed activities by ID
 * - Registering / listing / deleting webhook subscriptions
 */

import { prisma } from "@/lib/prisma";
import type { StravaDetailedActivity } from "@/types/strava";

const STRAVA_API = "https://www.strava.com/api/v3";

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Refresh a Strava access token using a refresh token.
 */
export async function refreshStravaAccessToken(
  refreshToken: string
): Promise<RefreshResult> {
  const response = await fetch(`${STRAVA_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to refresh Strava token");
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: data.expires_at,
  };
}

/**
 * Get a valid access token for a user, refreshing if necessary.
 * Updates the Account row in the DB with new tokens.
 */
export async function getValidStravaAccessToken(userId: string): Promise<string> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "strava" },
  });

  if (!account || !account.access_token || !account.refresh_token) {
    throw new Error(`No Strava account found for user ${userId}`);
  }

  // Token still valid (with 60s buffer)
  if (account.expires_at && Date.now() < (account.expires_at - 60) * 1000) {
    return account.access_token;
  }

  // Refresh
  const refreshed = await refreshStravaAccessToken(account.refresh_token);

  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: refreshed.accessToken,
      refresh_token: refreshed.refreshToken,
      expires_at: refreshed.expiresAt,
    },
  });

  return refreshed.accessToken;
}

/**
 * Fetch a single activity's full details from Strava.
 */
export async function fetchStravaActivity(
  accessToken: string,
  activityId: number
): Promise<StravaDetailedActivity> {
  const response = await fetch(`${STRAVA_API}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Strava API error (${response.status}): ${errorBody}`);
  }

  return response.json() as Promise<StravaDetailedActivity>;
}

// ─── Webhook Subscription Management ───────────────────────────

export interface WebhookSubscription {
  id: number;
  callback_url: string;
  created_at: string;
  updated_at: string;
}

/**
 * Register a new webhook subscription with Strava.
 */
export async function registerStravaWebhook(
  callbackUrl: string,
  verifyToken: string
): Promise<WebhookSubscription> {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID ?? "",
    client_secret: process.env.STRAVA_CLIENT_SECRET ?? "",
    callback_url: callbackUrl,
    verify_token: verifyToken,
  });

  const response = await fetch(`${STRAVA_API}/push_subscriptions`, {
    method: "POST",
    body: params,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || `Failed to register webhook: ${JSON.stringify(data)}`
    );
  }

  return data as WebhookSubscription;
}

/**
 * List existing webhook subscriptions.
 */
export async function listStravaWebhooks(): Promise<WebhookSubscription[]> {
  const url = new URL(`${STRAVA_API}/push_subscriptions`);
  url.searchParams.set("client_id", process.env.STRAVA_CLIENT_ID ?? "");
  url.searchParams.set("client_secret", process.env.STRAVA_CLIENT_SECRET ?? "");

  const response = await fetch(url.toString());
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || `Failed to list webhooks: ${JSON.stringify(data)}`
    );
  }

  return Array.isArray(data) ? data : [];
}

/**
 * Delete a webhook subscription.
 */
export async function deleteStravaWebhook(subscriptionId: number): Promise<void> {
  const url = new URL(`${STRAVA_API}/push_subscriptions/${subscriptionId}`);
  url.searchParams.set("client_id", process.env.STRAVA_CLIENT_ID ?? "");
  url.searchParams.set("client_secret", process.env.STRAVA_CLIENT_SECRET ?? "");

  const response = await fetch(url.toString(), { method: "DELETE" });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `Failed to delete webhook ${subscriptionId}`);
  }
}

/**
 * strava.ts — Helper functions for calling the Strava API.
 *
 * These functions are used by our API routes (in /api/strava/*).
 * They handle the actual HTTP calls to Strava and return typed data.
 *
 * Why not call Strava directly from the browser?
 * Because the access_token is secret — we keep it on the server side only.
 * The browser calls OUR API → Our API calls Strava → Returns the data.
 */

import type {
  StravaActivity,
  StravaAthlete,
  StravaAthleteStats,
  StravaDetailedActivity,
  StravaFriend,
  StravaClub,
  StravaClubMember,
} from "@/types/strava";

const STRAVA_API = "https://www.strava.com/api/v3";

/**
 * Generic Strava API fetcher with error handling.
 * All other functions use this under the hood.
 */
async function stravaFetch<T>(
  endpoint: string,
  accessToken: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${STRAVA_API}${endpoint}`);

  // Add query parameters if provided
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Strava API error (${response.status}): ${errorBody}`
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Fetch the logged-in athlete's profile.
 * Returns name, profile picture, etc.
 */
export async function getAthlete(
  accessToken: string
): Promise<StravaAthlete> {
  return stravaFetch<StravaAthlete>("/athlete", accessToken);
}

/**
 * Fetch the athlete's lifetime/recent stats.
 * Returns totals for runs, rides, swims (recent, year-to-date, all-time).
 */
export async function getAthleteStats(
  accessToken: string,
  athleteId: string
): Promise<StravaAthleteStats> {
  return stravaFetch<StravaAthleteStats>(
    `/athletes/${athleteId}/stats`,
    accessToken
  );
}

/**
 * Fetch a list of activities.
 *
 * @param page — Which page of results (1, 2, 3...)
 * @param perPage — How many per page (max 200, default 30)
 */
export async function getActivities(
  accessToken: string,
  page: number = 1,
  perPage: number = 30
): Promise<StravaActivity[]> {
  return stravaFetch<StravaActivity[]>("/athlete/activities", accessToken, {
    page: String(page),
    per_page: String(perPage),
  });
}

/**
 * Fetch a single activity with full details.
 * Includes splits, laps, calories, and more.
 */
export async function getActivityById(
  accessToken: string,
  activityId: string
): Promise<StravaDetailedActivity> {
  return stravaFetch<StravaDetailedActivity>(
    `/activities/${activityId}`,
    accessToken
  );
}

/**
 * NOTE: Strava removed the /athlete/follows and /athlete/friends endpoints
 * from their public API. Friend discovery is only possible through:
 * - Clubs (getAthleteClubs + getClubMembers)
 * - Activity kudos (getActivityKudos)
 */

/**
 * Fetch clubs the authenticated athlete belongs to.
 */
export async function getAthleteClubs(
  accessToken: string,
  page: number = 1,
  perPage: number = 30
): Promise<StravaClub[]> {
  return stravaFetch<StravaClub[]>("/athlete/clubs", accessToken, {
    page: String(page),
    per_page: String(perPage),
  });
}

/**
 * Fetch members of a specific Strava club.
 */
export async function getClubMembers(
  accessToken: string,
  clubId: number,
  page: number = 1,
  perPage: number = 30
): Promise<StravaClubMember[]> {
  return stravaFetch<StravaClubMember[]>(`/clubs/${clubId}/members`, accessToken, {
    page: String(page),
    per_page: String(perPage),
  });
}

/**
 * Fetch athletes who kudoed (liked) a specific activity.
 * These are likely friends of the activity owner.
 */
export async function getActivityKudos(
  accessToken: string,
  activityId: number,
  page: number = 1,
  perPage: number = 30
): Promise<StravaFriend[]> {
  return stravaFetch<StravaFriend[]>(`/activities/${activityId}/kudos`, accessToken, {
    page: String(page),
    per_page: String(perPage),
  });
}

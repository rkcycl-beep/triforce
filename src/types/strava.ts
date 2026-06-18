/**
 * strava.ts — TypeScript types for Strava API responses.
 *
 * These types describe the SHAPE of the data Strava sends us.
 * Think of them like a contract: "Strava promises to send data that looks like this."
 * TypeScript uses these to catch bugs before they happen.
 *
 * We only define the fields we actually use — Strava sends many more,
 * but we don't need to type every single one.
 */

/** A single activity (run, ride, swim, etc.) from Strava */
export interface StravaActivity {
  id: number;
  name: string;
  sport_type: string; // "Run", "Ride", "Swim", etc.
  type: string; // Legacy type field
  start_date: string; // ISO 8601 format: "2024-03-15T10:30:00Z"
  start_date_local: string; // Same but in athlete's timezone
  distance: number; // Meters
  moving_time: number; // Seconds
  elapsed_time: number; // Seconds (includes breaks)
  total_elevation_gain: number; // Meters
  average_speed: number; // Meters per second
  max_speed: number; // Meters per second
  average_heartrate?: number; // BPM (optional — needs HR monitor)
  max_heartrate?: number; // BPM (optional)
  has_heartrate: boolean;
  suffer_score?: number; // Strava's "Relative Effort" score
  map: StravaMap; // Route polyline data
  kudos_count: number;
  athlete_count: number; // People in group activity
}

/** Map/route data attached to an activity */
export interface StravaMap {
  id: string;
  summary_polyline: string; // Encoded polyline string (for drawing routes)
  resource_state: number;
}

/** The logged-in athlete's profile */
export interface StravaAthlete {
  id: number;
  firstname: string;
  lastname: string;
  profile: string; // Profile picture URL
  profile_medium: string; // Smaller profile picture
  city: string;
  state: string;
  country: string;
  sex: string;
  weight?: number; // kg
  created_at: string;
  updated_at: string;
}

/** Athlete stats from Strava (lifetime/recent totals) */
export interface StravaAthleteStats {
  recent_run_totals: StravaTotals;
  recent_ride_totals: StravaTotals;
  recent_swim_totals: StravaTotals;
  all_run_totals: StravaTotals;
  all_ride_totals: StravaTotals;
  all_swim_totals: StravaTotals;
  ytd_run_totals: StravaTotals;
  ytd_ride_totals: StravaTotals;
  ytd_swim_totals: StravaTotals;
}

/** Totals for a specific sport and time period */
export interface StravaTotals {
  count: number; // Number of activities
  distance: number; // Total meters
  moving_time: number; // Total seconds
  elapsed_time: number; // Total seconds including pauses
  elevation_gain: number; // Total meters climbed
}

/**
 * The detailed view of a single activity.
 * Extends StravaActivity with extra fields only available
 * when you fetch a specific activity by ID.
 */
export interface StravaDetailedActivity extends StravaActivity {
  description: string;
  calories: number;
  device_name?: string;
  splits_metric?: StravaSplit[];
  laps?: StravaLap[];
}

/** Per-kilometer split data */
export interface StravaSplit {
  distance: number;
  elapsed_time: number;
  moving_time: number;
  average_speed: number;
  average_heartrate?: number;
  split: number; // Split number (1, 2, 3...)
}

/** Lap data within an activity */
export interface StravaLap {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  lap_index: number;
}

/** A Strava athlete the user follows (from /athlete/follows) */
export interface StravaFriend {
  id: number;
  firstname: string;
  lastname: string;
  profile: string; // Profile picture URL
  profile_medium: string;
  city?: string;
  state?: string;
  country?: string;
}

/** An activity from /activities/following — includes minimal athlete info */
export interface StravaFollowingActivity {
  id: number;
  name: string;
  sport_type: string;
  start_date: string;
  distance: number;
  moving_time: number;
  kudos_count: number;
  athlete: {
    id: number;
    firstname: string;
    lastname: string;
    profile_medium: string;
    profile: string;
  };
}

/** A Strava club the athlete belongs to */
export interface StravaClub {
  id: number;
  name: string;
  profile_medium: string;
  profile: string;
  member_count: number;
  sport_type: string;
  city: string;
  state: string;
  country: string;
  private: boolean;
}

/** A member of a Strava club */
export interface StravaClubMember {
  id: number;
  firstname: string;
  lastname: string;
  profile_medium: string;
  profile: string;
  admin: boolean;
  owner: boolean;
}

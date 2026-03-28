import { prisma } from './prisma'

const STRAVA_API = 'https://www.strava.com/api/v3'
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token'

export async function refreshStravaToken(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: user.stravaRefreshToken,
    }),
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`)
  const data = await res.json()
  await prisma.user.update({
    where: { id: userId },
    data: { stravaAccessToken: data.access_token, stravaRefreshToken: data.refresh_token, stravaTokenExpiresAt: new Date(data.expires_at * 1000) },
  })
  return data.access_token
}

export async function getValidAccessToken(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  if (!user.stravaAccessToken) throw new Error('User has no Strava token')
  const expiresAt = user.stravaTokenExpiresAt?.getTime() ?? 0
  if (Date.now() + 5 * 60 * 1000 >= expiresAt) return refreshStravaToken(userId)
  return user.stravaAccessToken
}

export async function syncAthleteActivities(userId: string, after?: Date) {
  const token = await getValidAccessToken(userId)
  const params = new URLSearchParams({ per_page: '50', ...(after ? { after: String(Math.floor(after.getTime() / 1000)) } : {}) })
  const res = await fetch(`${STRAVA_API}/athlete/activities?${params}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Strava activities failed: ${res.status}`)
  const activities = await res.json()
  for (const act of activities) {
    await prisma.activity.upsert({ where: { stravaId: String(act.id) }, create: { athleteId: userId, stravaId: String(act.id), sportType: act.sport_type ?? act.type, name: act.name, distanceM: act.distance, durationS: act.moving_time, elevationM: act.total_elevation_gain, avgPaceSecPerKm: act.distance > 0 ? (act.moving_time / (act.distance / 1000)) : null, avgHr: act.average_heartrate, maxHr: act.max_heartrate, calories: act.calories, startDate: new Date(act.start_date), rawJson: act }, update: { name: act.name, rawJson: act } })
  }
  return activities.length
}

export function getStravaAuthUrl(state?: string): string {
  const params = new URLSearchParams({ client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID!, response_type: 'code', redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/strava/callback`, scope: 'activity:read_all,profile:read_all', approval_prompt: 'auto', ...(state ? { state } : {}) })
  return `https://www.strava.com/oauth/authorize?${params}`
}

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncAthleteActivities } from '@/lib/strava'

// GET â Strava webhook verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ 'hub.challenge': challenge })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST â Receive activity events from Strava
export async function POST(req: NextRequest) {
  const body = await req.json()

  if (body.object_type === 'activity' && body.aspect_type === 'create') {
    const stravaAthleteId = String(body.owner_id)
    const user = await prisma.user.findUnique({ where: { stravaId: stravaAthleteId } })

    if (user) {
      // Sync last 24h of activities
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
      await syncAthleteActivities(user.id, since)
    }
  }

  return NextResponse.json({ received: true })
}

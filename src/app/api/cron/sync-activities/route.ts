export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncAthleteActivities } from '@/lib/strava'

export async function GET() {
  const athletes = await prisma.user.findMany({
    where: { stravaId: { not: null }, stravaAccessToken: { not: null } },
    select: { id: true },
  })

  const since = new Date(Date.now() - 2 * 60 * 60 * 1000) // last 2 hours
  const results = await Promise.allSettled(
    athletes.map(a => syncAthleteActivities(a.id, since))
  )

  const synced = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({ synced, failed, total: athletes.length })
}

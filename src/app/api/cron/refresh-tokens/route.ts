export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { refreshStravaToken } from '@/lib/strava'

export async function GET() {
  // Find tokens expiring in the next 2 hours
  const expiringSoon = await prisma.user.findMany({
    where: {
      stravaRefreshToken: { not: null },
      stravaTokenExpiresAt: { lt: new Date(Date.now() + 2 * 60 * 60 * 1000) },
    },
    select: { id: true },
  })

  const results = await Promise.allSettled(
    expiringSoon.map(u => refreshStravaToken(u.id))
  )

  const refreshed = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({ refreshed, failed, total: expiringSoon.length })
}

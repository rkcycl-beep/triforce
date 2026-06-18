import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ inviterId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { inviterId } = await params;
  const inviteeId = session.user.id;

  if (inviterId === inviteeId) return NextResponse.json({ ok: true });

  const [inviter, inviteeUser, inviteeAccount] = await Promise.all([
    prisma.user.findUnique({ where: { id: inviterId }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: inviteeId }, select: { name: true, image: true } }),
    prisma.account.findFirst({
      where: { userId: inviteeId, provider: "strava" },
      select: { providerAccountId: true },
    }),
  ]);

  if (!inviter) return NextResponse.json({ error: "Inviter not found" }, { status: 404 });

  const fullName = inviteeUser?.name ?? "";
  const nameParts = fullName.trim().split(" ");
  const firstName = nameParts[0] ?? "";
  const lastInitial = nameParts[1]?.[0] ?? "";
  const abbreviatedName = lastInitial ? `${firstName} ${lastInitial}.` : firstName;
  const stravaId = inviteeAccount?.providerAccountId ?? null;
  const now = new Date();

  // Try to find an existing kudos contact by full name or abbreviated name
  const existing = await prisma.stravaContact.findFirst({
    where: {
      userId: inviterId,
      OR: [
        { name: fullName },
        { name: abbreviatedName },
        ...(stravaId ? [{ stravaAthleteId: stravaId }] : []),
      ],
    },
  });

  if (existing) {
    await prisma.stravaContact.update({
      where: { id: existing.id },
      data: {
        triforceUserId: inviteeId,
        stravaAthleteId: stravaId ?? existing.stravaAthleteId,
        isChosen: true,
      },
    });
  } else {
    // No existing contact — create one so they appear in the compare hub
    await prisma.stravaContact.upsert({
      where: { userId_name: { userId: inviterId, name: fullName || `Friend_${inviteeId.slice(0, 8)}` } },
      create: {
        userId: inviterId,
        name: fullName || `Friend_${inviteeId.slice(0, 8)}`,
        kudosCount: 0,
        latestKudosAt: now,
        scannedAt: now,
        triforceUserId: inviteeId,
        stravaAthleteId: stravaId,
        isChosen: true,
      },
      update: {
        triforceUserId: inviteeId,
        stravaAthleteId: stravaId,
        isChosen: true,
      },
    });
  }

  // Create mutual Follow relationship
  await Promise.all([
    prisma.follow.upsert({
      where: { followerId_followingId: { followerId: inviteeId, followingId: inviterId } },
      create: { followerId: inviteeId, followingId: inviterId },
      update: {},
    }),
    prisma.follow.upsert({
      where: { followerId_followingId: { followerId: inviterId, followingId: inviteeId } },
      create: { followerId: inviterId, followingId: inviteeId },
      update: {},
    }),
  ]);

  return NextResponse.json({ ok: true });
}

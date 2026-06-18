import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Extract numeric Strava athlete ID from URL or raw number string
function parseStravaId(input: string): string | null {
  const trimmed = input.trim();
  // URL format: https://www.strava.com/athletes/12345678
  const urlMatch = trimmed.match(/strava\.com\/athletes\/(\d+)/);
  if (urlMatch) return urlMatch[1];
  // Raw number
  if (/^\d+$/.test(trimmed)) return trimmed;
  return null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { contactId } = await params;
  const body = await request.json() as { stravaUrl?: string };
  const stravaAthleteId = parseStravaId(body.stravaUrl ?? "");

  if (!stravaAthleteId) {
    return NextResponse.json({ error: "Invalid Strava URL or ID" }, { status: 400 });
  }

  const contact = await prisma.stravaContact.findFirst({
    where: { id: contactId, userId: session.user.id },
  });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check if this Strava ID belongs to a TriForce user
  const tfAccount = await prisma.account.findFirst({
    where: { provider: "strava", providerAccountId: stravaAthleteId },
    select: { userId: true },
  });

  const updated = await prisma.stravaContact.update({
    where: { id: contactId },
    data: { stravaAthleteId, triforceUserId: tfAccount?.userId ?? contact.triforceUserId },
  });

  return NextResponse.json({ stravaAthleteId: updated.stravaAthleteId });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { contactId } = await params;

  const contact = await prisma.stravaContact.findFirst({
    where: { id: contactId, userId: session.user.id },
  });

  if (!contact) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.stravaContact.update({
    where: { id: contactId },
    data: { isChosen: !contact.isChosen },
  });

  return NextResponse.json({ isChosen: updated.isChosen });
}

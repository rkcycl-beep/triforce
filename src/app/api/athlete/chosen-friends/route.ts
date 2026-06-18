import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const contacts = await prisma.stravaContact.findMany({
    where: { userId: session.user.id, isChosen: true },
    orderBy: { latestKudosAt: "desc" },
    select: { id: true, name: true, kudosCount: true, triforceUserId: true, stravaAthleteId: true },
  });

  return NextResponse.json({ friends: contacts });
}

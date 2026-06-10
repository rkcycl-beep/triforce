import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

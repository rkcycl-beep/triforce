import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ inviterId: string }> }
) {
  const { inviterId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: inviterId },
    select: { name: true, image: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupMessages } from "@/services/message.service";
import CoachMessageCompose from "./CoachMessageCompose";

interface Props {
  params: Promise<{ groupId: string }>;
}

export default async function CoachMessagesPage({ params }: Props) {
  const { groupId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) notFound();

  const membership = await prisma.groupMembership.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  });
  if (!membership || membership.role !== "COACH") notFound();

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) notFound();

  const messages = await getGroupMessages(groupId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/coach/groups/${groupId}`} className="text-sm text-gray-500 hover:text-gray-700">
            ← {group.name}
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Messages</h1>
        </div>
      </div>

      {/* Compose */}
      <CoachMessageCompose groupId={groupId} />

      {/* Message history */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">
            Sent messages
            <span className="ms-2 text-sm font-normal text-gray-500">({messages.length})</span>
          </h2>
        </div>

        {messages.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-500">No messages sent yet.</p>
            <p className="mt-1 text-xs text-gray-400">Use the form above to broadcast a message to your group.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {messages.map((msg) => (
              <li key={msg.id} className="px-5 py-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    msg.type === "ANNOUNCEMENT"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {msg.type.charAt(0) + msg.type.slice(1).toLowerCase()}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(msg.createdAt).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-gray-700">{msg.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupEvents } from "@/services/event.service";
import CoachEventForm from "./CoachEventForm";

interface Props {
  params: Promise<{ groupId: string }>;
}

export default async function CoachEventsPage({ params }: Props) {
  const { groupId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) notFound();

  const membership = await prisma.groupMembership.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
  });
  if (!membership || membership.role !== "COACH") notFound();

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) notFound();

  const events = await getGroupEvents(groupId);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/coach/groups/${groupId}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← {group.name}
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">Events</h1>
      </div>

      {/* Create form */}
      <CoachEventForm groupId={groupId} />

      {/* Event list */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">
            All events
            <span className="ms-2 text-sm font-normal text-gray-500">({events.length})</span>
          </h2>
        </div>

        {events.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-500">No events yet.</p>
            <p className="mt-1 text-xs text-gray-400">Use the form above to create an event for your group.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {events.map((ev) => {
              const isPast = new Date(ev.eventDate) < new Date();
              return (
                <li key={ev.id} className={`px-5 py-4 ${isPast ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">{ev.name}</p>
                      {ev.description && (
                        <p className="mt-0.5 text-sm text-gray-500">{ev.description}</p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
                        <span>📅 {new Date(ev.eventDate).toLocaleString("en-GB", {
                          weekday: "short", day: "numeric", month: "short",
                          hour: "2-digit", minute: "2-digit",
                        })}</span>
                        {ev.location && <span>📍 {ev.location}</span>}
                      </div>
                    </div>
                    <CoachEventDelete groupId={groupId} eventId={ev.id} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function CoachEventDelete({ groupId, eventId }: { groupId: string; eventId: string }) {
  return (
    <form action={`/api/coach/groups/${groupId}/events`} method="POST" className="shrink-0">
      <input type="hidden" name="eventId" value={eventId} />
    </form>
  );
}

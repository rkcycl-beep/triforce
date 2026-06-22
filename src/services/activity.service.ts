/**
 * activity.service.ts — Prisma-backed CRUD for the Activity table.
 *
 * Returns raw Prisma rows. Mapping to the unified UI Activity type is the
 * responsibility of the caller (see `dbActivityToUnified` in lib/normalizers.ts).
 */

import type { Activity as DbActivity, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type UpsertActivityInput = {
  userId: string;
  groupId?: string | null;
  provider: string;
  providerActivityId: string;
  name: string;
  sportType: string;
  rawSportType: string;
  startDate: Date;
  distance: number;
  movingTime: number;
  elapsedTime: number;
  elevationGain: number;
  averageSpeed: number;
  maxSpeed: number;
  averageHeartrate?: number | null;
  maxHeartrate?: number | null;
  hasHeartrate: boolean;
  mapPolyline?: string | null;
  calories?: number | null;
};

export async function upsertActivity(
  input: UpsertActivityInput
): Promise<DbActivity> {
  const data: Prisma.ActivityUncheckedCreateInput = {
    userId: input.userId,
    groupId: input.groupId ?? null,
    provider: input.provider,
    providerActivityId: input.providerActivityId,
    name: input.name,
    sportType: input.sportType,
    rawSportType: input.rawSportType,
    startDate: input.startDate,
    distance: input.distance,
    movingTime: input.movingTime,
    elapsedTime: input.elapsedTime,
    elevationGain: input.elevationGain,
    averageSpeed: input.averageSpeed,
    maxSpeed: input.maxSpeed,
    averageHeartrate: input.averageHeartrate ?? null,
    maxHeartrate: input.maxHeartrate ?? null,
    hasHeartrate: input.hasHeartrate,
    mapPolyline: input.mapPolyline ?? null,
    calories: input.calories ?? null,
  };

  return prisma.activity.upsert({
    where: {
      provider_providerActivityId_userId: {
        provider: input.provider,
        providerActivityId: input.providerActivityId,
        userId: input.userId,
      },
    },
    create: data,
    update: data,
  });
}

export type ListActivitiesOptions = {
  take?: number;
  skip?: number;
  from?: Date;
  to?: Date;
};

export async function listActivitiesForUser(
  userId: string,
  opts: ListActivitiesOptions = {}
): Promise<DbActivity[]> {
  const { take = 30, skip = 0, from, to } = opts;
  return prisma.activity.findMany({
    where: {
      userId,
      ...(from || to ? {
        startDate: {
          ...(from ? { gte: from } : {}),
          ...(to   ? { lte: to   } : {}),
        },
      } : {}),
    },
    orderBy: { startDate: "desc" },
    take,
    skip,
  });
}

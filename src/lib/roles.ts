/**
 * Role helpers for the capability-based role model.
 *
 * Every user has the "ATHLETE" (trainer) capability by default.
 * "COACH" is an additional capability.
 */

export type Role = "ATHLETE" | "COACH";

export function isCoach(roles?: Role[] | string[], legacyRole?: string): boolean {
  if (roles && roles.length > 0) {
    return roles.includes("COACH");
  }
  return legacyRole === "COACH";
}

export function isAthlete(roles?: Role[] | string[], legacyRole?: string): boolean {
  if (roles && roles.length > 0) {
    return roles.includes("ATHLETE");
  }
  return legacyRole === "ATHLETE" || legacyRole === "COACH";
}

export function ensureRoles(roles?: Role[] | string[], legacyRole?: string): Role[] {
  if (roles && roles.length > 0) {
    return roles as Role[];
  }
  if (legacyRole === "COACH") return ["ATHLETE", "COACH"];
  return ["ATHLETE"];
}

export const ROLE_COOKIE = "triforce_role";

export function setRoleCookie(role: "athlete" | "coach") {
  // 30 days, same-site lax, accessible to client and server.
  document.cookie = `${ROLE_COOKIE}=${role}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

export function clearRoleCookie() {
  document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function getRoleCookie(): "athlete" | "coach" | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${ROLE_COOKIE}=([^;]+)`));
  const value = match?.[1];
  return value === "athlete" || value === "coach" ? value : null;
}

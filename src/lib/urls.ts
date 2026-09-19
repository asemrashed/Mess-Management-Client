/** Only allow in-app relative paths so login redirects cannot be used for open redirects. */
export const DEFAULT_AFTER_LOGIN = "/home";

export function safeCallbackUrl(raw: string | null | undefined, fallback = DEFAULT_AFTER_LOGIN) {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) return fallback;
  return raw;
}

function pathnameOf(path: string) {
  return path.split("?")[0];
}

/** Landing pages that should yield to the user's mess dashboard when they have one. */
export function isGenericLanding(path: string) {
  return ["", "/home", "/create-mess", "/login", "/register", "/verify"].includes(pathnameOf(path));
}

/** Flatten /home?callbackUrl=/join/invite/... back to the real destination. */
export function unwrapCallbackUrl(raw: string | null | undefined) {
  const safe = safeCallbackUrl(raw);
  if (pathnameOf(safe) === "/home" && safe.includes("?")) {
    try {
      const nested = new URL(safe, "http://local").searchParams.get("callbackUrl");
      const nestedSafe = safeCallbackUrl(nested, "");
      if (nestedSafe && !isGenericLanding(nestedSafe)) return nestedSafe;
    } catch {
      /* ignore */
    }
  }
  return safe;
}

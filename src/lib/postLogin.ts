"use client";

import { api } from "./api";
import { isGenericLanding, unwrapCallbackUrl } from "./urls";

type MeResponse = {
  memberships: { mess: { username: string } }[];
};

/** After login: honor a deep link (invite, mess page), otherwise go to the user's mess or Create Mess. */
export async function resolvePostLoginPath(callbackUrl?: string | null) {
  const safe = unwrapCallbackUrl(callbackUrl);
  if (!isGenericLanding(safe)) return safe;

  try {
    const data = await api.get<MeResponse>("/auth/me");
    const username = data.memberships?.[0]?.mess?.username;
    if (username) return `/mess/${username}/dashboard`;
  } catch {
    for (let i = 0; i < 3; i++) {
      await new Promise((r) => setTimeout(r, 250));
      try {
        const data = await api.get<MeResponse>("/auth/me");
        const username = data.memberships?.[0]?.mess?.username;
        if (username) return `/mess/${username}/dashboard`;
        break;
      } catch {
        /* session still settling after sign-in */
      }
    }
  }
  return "/create-mess";
}

export function googleCallbackUrl(callbackUrl: string) {
  const safe = unwrapCallbackUrl(callbackUrl);
  if (isGenericLanding(safe)) return "/home";
  return `/home?callbackUrl=${encodeURIComponent(safe)}`;
}

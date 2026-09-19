"use client";

import { AuthGate } from "@/components/AuthGate";
import { MessProvider, useMess } from "@/context/MessContext";
import { NavIcon, NavIconName } from "@/components/NavIcons";
import { api } from "@/lib/api";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  feature?: string;
  adminOnly?: boolean;
  badgeKey?: string;
};

const GROUPS: { id: string; label: string; items: NavItem[] }[] = [
  {
    id: "overview",
    label: "Overview",
    items: [{ href: "dashboard", label: "Dashboard", icon: "dashboard" }],
  },
  {
    id: "daily",
    label: "Daily",
    items: [
      { href: "meals", label: "Meals", icon: "meals", feature: "mealManagementEnabled", badgeKey: "meals" },
      { href: "groceries", label: "Groceries", icon: "groceries", feature: "groceryEnabled", badgeKey: "groceries" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    items: [
      { href: "bills", label: "Bills", icon: "bills", feature: "rentEnabled" },
      { href: "payments", label: "Payments", icon: "payments", badgeKey: "payments" },
      { href: "advances", label: "Advances", icon: "advances", badgeKey: "advances" },
    ],
  },
  {
    id: "house",
    label: "House",
    items: [
      { href: "members", label: "Members", icon: "members", badgeKey: "members" },
      { href: "polls", label: "Polls", icon: "polls", feature: "pollsEnabled", badgeKey: "polls" },
      { href: "notes", label: "Notes", icon: "notes", feature: "notesEnabled" },
      { href: "routines", label: "Routines", icon: "routines", feature: "routinesEnabled" },
      { href: "exit", label: "Exit", icon: "exit", feature: "exitManagementEnabled", badgeKey: "exit" },
      { href: "rules", label: "Rules", icon: "rules" },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    items: [
      { href: "reports", label: "Reports", icon: "reports", adminOnly: true },
      { href: "settings", label: "Settings", icon: "settings", adminOnly: true },
    ],
  },
];

const SECTION_BY_HREF: Record<string, string> = {
  meals: "meals",
  groceries: "groceries",
  payments: "payments",
  advances: "advances",
  members: "members",
  polls: "polls",
  exit: "exit",
};

function MessNav({ messUsername }: { messUsername: string }) {
  const { mess, myRole } = useMess();
  const pathname = usePathname();
  const qc = useQueryClient();

  const { data: badgeData } = useQuery({
    queryKey: ["sidebar-counts", messUsername],
    queryFn: () => api.get<{ counts: Record<string, number> }>(`/mess/${messUsername}/overview/sidebar-counts`),
    enabled: !!mess,
    refetchInterval: 15000,
  });

  const markSeen = useMutation({
    mutationFn: (section: string) => api.post(`/mess/${messUsername}/overview/sidebar-counts/seen`, { section }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sidebar-counts", messUsername] }),
  });

  const currentHref = pathname?.split("/")[3] ?? "";

  useEffect(() => {
    const section = SECTION_BY_HREF[currentHref];
    if (!section) return;
    markSeen.mutate(section);
    return () => {
      markSeen.mutate(section);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentHref, messUsername]);

  const counts = badgeData?.counts ?? {};

  const groups = useMemo(() => {
    return GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.adminOnly && myRole !== "ADMIN") return false;
        if (item.feature && mess?.settings && !(mess.settings as any)[item.feature]) return false;
        return true;
      }),
    })).filter((group) => group.items.length);
  }, [mess?.settings, myRole]);

  return (
    <aside className="w-full sm:w-60 shrink-0 border-b sm:border-b-0 sm:border-r bg-white flex flex-col sm:h-full">
      <div className="px-4 py-4 border-b shrink-0 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold truncate">{mess?.name ?? "Loading…"}</p>
          {myRole && <span className="badge bg-brand-100 text-brand-700 mt-1">{myRole}</span>}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="sm:hidden text-xs text-gray-400 hover:text-gray-600 shrink-0"
        >
          Sign out
        </button>
      </div>
      <nav className="flex sm:flex-col overflow-x-auto sm:overflow-y-auto sm:flex-1 thin-scroll">
        {groups.map((group) => (
          <div key={group.id} className="contents sm:block sm:py-2">
            <p className="hidden sm:block px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              {group.label}
            </p>
            {group.items.map((item) => {
              const href = `/mess/${messUsername}/${item.href}`;
              const active = pathname?.startsWith(href);
              const count = item.badgeKey && item.href !== currentHref ? counts[item.badgeKey] ?? 0 : 0;
              return (
                <Link
                  key={item.href}
                  href={href}
                  className={`flex items-center gap-2.5 px-4 py-2.5 text-sm whitespace-nowrap border-b sm:border-b-0 sm:border-l-2 ${
                    active
                      ? "sm:border-brand-600 text-brand-700 font-medium bg-brand-50"
                      : "sm:border-transparent text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <NavIcon name={item.icon} className="w-4 h-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {count > 0 && (
                    <span className="min-w-[1.15rem] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] leading-5 text-center font-semibold">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="hidden sm:block px-4 py-3 text-sm text-gray-400 hover:text-gray-600 border-t shrink-0 text-left"
      >
        Sign out
      </button>
    </aside>
  );
}

export default function MessLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ messUsername: string }>();
  const messUsername = params.messUsername;

  return (
    <AuthGate>
      <MessProvider messUsername={messUsername}>
        <div className="h-[100dvh] flex flex-col sm:flex-row overflow-hidden">
          <MessNav messUsername={messUsername} />
          <main className="flex-1 min-h-0 overflow-y-auto thin-scroll p-4 sm:p-6">
            <div className="max-w-6xl">{children}</div>
          </main>
        </div>
      </MessProvider>
    </AuthGate>
  );
}

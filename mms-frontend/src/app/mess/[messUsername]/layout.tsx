"use client";

import { AuthGate } from "@/components/AuthGate";
import { MessProvider, useMess } from "@/context/MessContext";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { signOut } from "next-auth/react";

const LINKS: { href: string; label: string; feature?: string; adminOnly?: boolean }[] = [
  { href: "dashboard", label: "Dashboard" },
  { href: "meals", label: "Meals", feature: "mealManagementEnabled" },
  { href: "groceries", label: "Groceries", feature: "groceryEnabled" },
  { href: "notes", label: "Notes", feature: "notesEnabled" },
  { href: "polls", label: "Polls", feature: "pollsEnabled" },
  { href: "bills", label: "Bills", feature: "rentEnabled" },
  { href: "payments", label: "Payments" },
  { href: "advances", label: "Advances" },
  { href: "routines", label: "Routines", feature: "routinesEnabled" },
  { href: "exit", label: "Exit", feature: "exitManagementEnabled" },
  { href: "members", label: "Members" },
  { href: "rules", label: "Rules" },
  { href: "reports", label: "Reports", adminOnly: true },
  { href: "settings", label: "Settings", adminOnly: true },
];

function MessNav({ messUsername }: { messUsername: string }) {
  const { mess, myRole } = useMess();
  const pathname = usePathname();

  const visibleLinks = LINKS.filter((l) => {
    if (l.adminOnly && myRole !== "ADMIN") return false;
    if (l.feature && mess?.settings && !(mess.settings as any)[l.feature]) return false;
    return true;
  });

  return (
    <aside className="w-full sm:w-56 shrink-0 border-r bg-white sm:min-h-screen">
      <div className="px-4 py-4 border-b">
        <p className="font-semibold truncate">{mess?.name ?? "Loading…"}</p>
        {myRole && <span className="badge bg-brand-100 text-brand-700 mt-1">{myRole}</span>}
      </div>
      <nav className="flex sm:flex-col overflow-x-auto sm:overflow-visible">
        {visibleLinks.map((l) => {
          const href = `/mess/${messUsername}/${l.href}`;
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={l.href}
              href={href}
              className={`px-4 py-2.5 text-sm whitespace-nowrap border-b sm:border-b-0 sm:border-l-2 ${
                active ? "sm:border-brand-600 text-brand-700 font-medium bg-brand-50" : "sm:border-transparent text-gray-600 hover:bg-gray-50"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <button onClick={() => signOut({ callbackUrl: "/" })} className="px-4 py-3 text-sm text-gray-400 hover:text-gray-600">
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
        <div className="min-h-screen flex flex-col sm:flex-row">
          <MessNav messUsername={messUsername} />
          <main className="flex-1 p-4 sm:p-6 max-w-4xl">{children}</main>
        </div>
      </MessProvider>
    </AuthGate>
  );
}

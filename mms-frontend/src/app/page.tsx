import Link from "next/link";
import { Fraunces } from "next/font/google";

const serif = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
});

const steps = [
  {
    n: "01",
    title: "Create or join a Mess",
    body: "Start one in a minute, or join with an invite link or a join code from your Admin.",
  },
  {
    n: "02",
    title: "Log meals and purchases",
    body: "Tap +/- for tomorrow's meals before the deadline. Anyone can submit a grocery purchase for a Manager to approve.",
  },
  {
    n: "03",
    title: "The month closes itself",
    body: "Meal rate, bills, and dues are calculated automatically. Every member sees their own statement — no one has to ask.",
  },
];

const ledgerItems = [
  {
    title: "Meals",
    body: "Breakfast, lunch, and dinner logged in seconds, with a server-enforced deadline and guest meals counted in.",
  },
  {
    title: "Groceries",
    body: "Any member logs a purchase; a Manager approves it before it touches the accounts. Rejected purchases never affect the meal rate.",
  },
  {
    title: "Bills & rent",
    body: "Split equally or set custom amounts per member. Dues update the moment a bill is added.",
  },
  {
    title: "Advances & payments",
    body: "Every taka is a recorded transaction, not a number someone can quietly edit. Balances are always traceable.",
  },
  {
    title: "Polls & notes",
    body: "Settle what's for dinner and who's buying detergent without losing it in a group chat.",
  },
  {
    title: "Routines",
    body: "Chores like bathroom cleaning rotate on their own, with a record of who did what and when.",
  },
  {
    title: "Permanent exit",
    body: "When someone moves out for good, their settlement — dues, advance, refund — is calculated and kept on record.",
  },
  {
    title: "Rules & directory",
    body: "House rules and member contacts live in one place instead of a pinned message no one can find.",
  },
];

const roles = [
  {
    role: "Admin",
    body: "Runs the Mess — members, settings, bills, monthly closing, and the full financial picture.",
  },
  {
    role: "Manager",
    body: "Handles the day to day — approves groceries, watches the meal rate, keeps the board current.",
  },
  {
    role: "Member",
    body: "Opens the app, taps a button for tomorrow's meals, and gets on with their day.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#F2F1E9] text-[#22271F]">
      <header className="px-6 sm:px-10 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <span className={`${serif.className} text-lg font-semibold tracking-tight`}>MMS</span>
        <nav className="flex items-center gap-6">
          <Link
            href="/login"
            className="text-sm text-[#4A4F42] hover:text-[#22271F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#33642f] focus-visible:ring-offset-2 rounded"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium bg-[#33642f] text-[#F2F1E9] px-4 py-2 rounded-full hover:bg-[#284f25] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#33642f] focus-visible:ring-offset-2"
          >
            Get started
          </Link>
        </nav>
      </header>

      {/* HERO */}
      <section className="px-6 sm:px-10 max-w-6xl mx-auto pt-10 sm:pt-16 pb-20 grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-14 items-center">
        <div>
          <p className="text-sm text-[#5C6152] mb-5">For bachelor messes, hostels, and shared flats</p>
          <h1 className={`${serif.className} text-[2.75rem] sm:text-5xl leading-[1.08] tracking-tight mb-6`}>
            The ledger your mess has been keeping on a notebook.
          </h1>
          <p className="text-[#4A4F42] text-lg max-w-md leading-relaxed mb-8">
            MMS replaces the notebook, the spreadsheet, and the group-chat math with one
            record everyone can see: meals, groceries, rent, and who owes what — worked
            out automatically, every month.
          </p>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <Link
              href="/login"
              className="text-sm font-medium bg-[#33642f] text-[#F2F1E9] px-5 py-3 rounded-full hover:bg-[#284f25] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#33642f] focus-visible:ring-offset-2"
            >
              Create your Mess
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium px-5 py-3 rounded-full border border-[#22271F]/20 hover:border-[#22271F]/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#33642f] focus-visible:ring-offset-2"
            >
              Sign in
            </Link>
          </div>
          <p className="text-sm text-[#5C6152]">Free to start. No ads, no card required.</p>
        </div>

        {/* Hero visual: a real monthly statement, not an icon grid */}
        <div className="bg-[#20261B] text-[#F2F1E9] rounded-2xl p-7 sm:p-8 shadow-[0_20px_50px_-20px_rgba(34,39,31,0.45)]">
          <div className="flex items-baseline justify-between mb-5">
            <span className={`${serif.className} text-lg`}>August 2026</span>
            <span className="text-xs text-[#B9812C] tabular-nums">Meal Rate ৳30</span>
          </div>
          <dl className="space-y-2.5 text-sm mb-5">
            <div className="flex justify-between">
              <dt className="text-[#C8CBBE]">Rahim — 70 meals × ৳30</dt>
              <dd className="tabular-nums">৳2,100</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#C8CBBE]">Karim — 58 meals × ৳30</dt>
              <dd className="tabular-nums">৳1,740</dd>
            </div>
          </dl>
          <div className="h-px bg-[#F2F1E9]/15 mb-5" />
          <dl className="space-y-2.5 text-sm mb-5">
            <div className="flex justify-between">
              <dt className="text-[#C8CBBE]">Rent</dt>
              <dd className="tabular-nums">৳5,000</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#C8CBBE]">WiFi</dt>
              <dd className="tabular-nums">৳300</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#C8CBBE]">Maid</dt>
              <dd className="tabular-nums">৳500</dd>
            </div>
          </dl>
          <div className="h-px bg-[#F2F1E9]/15 mb-5" />
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-[#C8CBBE]">Total</dt>
              <dd className="tabular-nums">৳8,100</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#C8CBBE]">Paid</dt>
              <dd className="tabular-nums">৳6,000</dd>
            </div>
            <div className="flex justify-between font-medium">
              <dt>Due</dt>
              <dd className="tabular-nums text-[#B9812C]">৳2,100</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="h-px bg-[#22271F]/10 max-w-6xl mx-auto" />

      {/* HOW IT WORKS */}
      <section className="px-6 sm:px-10 max-w-6xl mx-auto py-16 sm:py-20">
        <h2 className={`${serif.className} text-2xl sm:text-3xl mb-10`}>How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
          {steps.map((s) => (
            <div key={s.n}>
              <span className="text-sm text-[#B9812C] tabular-nums">{s.n}</span>
              <h3 className="font-medium text-lg mt-2 mb-2">{s.title}</h3>
              <p className="text-[#4A4F42] text-sm leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px bg-[#22271F]/10 max-w-6xl mx-auto" />

      {/* FEATURE LEDGER */}
      <section className="px-6 sm:px-10 max-w-6xl mx-auto py-16 sm:py-20">
        <h2 className={`${serif.className} text-2xl sm:text-3xl mb-10`}>What&apos;s inside</h2>
        <div>
          {ledgerItems.map((item) => (
            <div
              key={item.title}
              className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-2 sm:gap-8 py-5 border-t border-[#22271F]/10 last:border-b"
            >
              <h3 className="font-medium">{item.title}</h3>
              <p className="text-[#4A4F42] text-sm leading-relaxed max-w-lg">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px bg-[#22271F]/10 max-w-6xl mx-auto" />

      {/* ROLES */}
      <section className="px-6 sm:px-10 max-w-6xl mx-auto py-16 sm:py-20">
        <h2 className={`${serif.className} text-2xl sm:text-3xl mb-10`}>One app, three views</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
          {roles.map((r) => (
            <div key={r.role}>
              <h3 className="font-medium text-lg mb-2">{r.role}</h3>
              <p className="text-[#4A4F42] text-sm leading-relaxed">{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CLOSING CTA */}
      <section className="bg-[#20261B] text-[#F2F1E9]">
        <div className="px-6 sm:px-10 max-w-6xl mx-auto py-16 sm:py-20 text-center">
          <h2 className={`${serif.className} text-3xl sm:text-4xl mb-4`}>Close the notebook.</h2>
          <p className="text-[#C8CBBE] max-w-md mx-auto mb-8">
            Set up your Mess in a few minutes. Invite your roommates, and let next month's
            statement write itself.
          </p>
          <Link
            href="/login"
            className="inline-block text-sm font-medium bg-[#F2F1E9] text-[#20261B] px-6 py-3 rounded-full hover:bg-[#E4E2D5] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2F1E9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#20261B]"
          >
            Create your Mess
          </Link>
        </div>
      </section>

      <footer className="px-6 sm:px-10 max-w-6xl mx-auto py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className={`${serif.className} text-sm`}>MMS — Mess Management System</span>
        <div className="flex items-center gap-6 text-sm text-[#5C6152]">
          <Link href="/login" className="hover:text-[#22271F]">
            Sign in
          </Link>
          <Link href="/login" className="hover:text-[#22271F]">
            Create a Mess
          </Link>
        </div>
      </footer>
    </main>
  );
}
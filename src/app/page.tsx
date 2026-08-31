import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <span className="font-semibold text-lg text-brand-700">MMS</span>
        <Link href="/login" className="btn-primary">
          Get Started
        </Link>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 gap-6">
        <h1 className="text-4xl font-bold tracking-tight max-w-2xl">
          Run your mess like a household, not an accounting ERP.
        </h1>
        <p className="text-gray-600 max-w-xl">
          Meals, groceries, bills, rent, advances, polls and routines for bachelor messes,
          hostels and shared apartments — one simple app for every member.
        </p>
        <div className="flex gap-3">
          <Link href="/login" className="btn-primary">
            Create or Join a Mess
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 max-w-3xl w-full text-left">
          <div className="card">
            <h3 className="font-medium mb-1">Meals in seconds</h3>
            <p className="text-sm text-gray-500">Tap +/- for tomorrow&apos;s breakfast, lunch and dinner.</p>
          </div>
          <div className="card">
            <h3 className="font-medium mb-1">Transparent finances</h3>
            <p className="text-sm text-gray-500">Meal rate, bills and dues calculated automatically each month.</p>
          </div>
          <div className="card">
            <h3 className="font-medium mb-1">Built for roommates</h3>
            <p className="text-sm text-gray-500">Groceries, notes, polls, routines and permanent exit settlement.</p>
          </div>
        </div>
      </section>

      <footer className="text-center text-xs text-gray-400 py-6">Mess Management System</footer>
    </main>
  );
}

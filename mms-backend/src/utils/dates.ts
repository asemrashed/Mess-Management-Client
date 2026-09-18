/**
 * Timezone-aware date helpers. Deadline decisions are always made on the server
 * using the Mess's configured timezone (default Asia/Dhaka), never the client clock.
 */

export function nowInTimezone(timezone: string): Date {
  const s = new Date().toLocaleString("en-US", { timeZone: timezone });
  return new Date(s);
}

/** Returns true if "now" (in the given timezone) is past the deadline hour for the given target date. */
export function isMealDeadlinePassed(targetDate: Date, deadlineHour: number, timezone: string): boolean {
  const now = nowInTimezone(timezone);
  const deadline = new Date(targetDate);
  deadline.setDate(deadline.getDate() - 1); // deadline is the evening before the meal date
  deadline.setHours(deadlineHour, 0, 0, 0);
  return now.getTime() > deadline.getTime();
}

export function startOfMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1));
}

export function endOfMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
}

export function daysBetween(a: Date, b: Date): number {
  const ms = Math.abs(b.getTime() - a.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

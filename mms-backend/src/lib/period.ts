import { prisma } from "./prisma";
import { Errors } from "./errors";
import { startOfMonth, endOfMonth } from "../utils/dates";

/** Find an OPEN period, or create one for the current month if none exists. */
export async function ensureOpenPeriod(messId: string) {
  const open = await prisma.accountingPeriod.findFirst({
    where: { messId, status: "OPEN" },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  if (open) return open;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const existing = await prisma.accountingPeriod.findUnique({
    where: { messId_year_month: { messId, year, month } },
  });
  if (existing) {
    if (existing.status === "OPEN") return existing;
    throw Errors.accountingPeriodClosed();
  }

  return prisma.accountingPeriod.create({
    data: {
      messId,
      year,
      month,
      startDate: startOfMonth(year, month),
      endDate: endOfMonth(year, month),
      status: "OPEN",
    },
  });
}

export function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

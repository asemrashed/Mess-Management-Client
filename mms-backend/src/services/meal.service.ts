import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

const ZERO = new Prisma.Decimal(0);

/**
 * Meal Pool = approved eligible grocery/meal expenses - meal-related adjustments,
 * for a given accounting period. Rent and unrelated household expenses never enter this.
 */
export async function calculateMealPool(messId: string, accountingPeriodId: string): Promise<Prisma.Decimal> {
  const approved = await prisma.groceryPurchase.aggregate({
    where: { messId, accountingPeriodId, status: "APPROVED" },
    _sum: { amount: true },
  });
  return approved._sum.amount ?? ZERO;
}

/** Total eligible meals = sum of member meal requests + guest meals in the period. */
export async function calculateTotalMeals(messId: string, startDate: Date, endDate: Date): Promise<number> {
  const requests = await prisma.mealRequest.findMany({
    where: { messId, date: { gte: startDate, lte: endDate } },
    select: { breakfast: true, lunch: true, dinner: true },
  });
  const memberMeals = requests.reduce((sum, r) => sum + r.breakfast + r.lunch + r.dinner, 0);

  const guests = await prisma.guestMeal.aggregate({
    where: { messId, date: { gte: startDate, lte: endDate } },
    _sum: { quantity: true },
  });

  return memberMeals + (guests._sum.quantity ?? 0);
}

/** Meal Pool ÷ Total Eligible Meals = Meal Rate. Zero meals is handled explicitly. */
export function calculateMealRate(mealPool: Prisma.Decimal, totalMeals: number): Prisma.Decimal {
  if (totalMeals <= 0) return ZERO;
  return mealPool.dividedBy(totalMeals);
}

/** Member Meals x Meal Rate = Member Meal Charge. */
export async function calculateMemberMealCost(
  messId: string,
  userId: string,
  startDate: Date,
  endDate: Date,
  mealRate: Prisma.Decimal
): Promise<{ mealCount: number; charge: Prisma.Decimal }> {
  const requests = await prisma.mealRequest.findMany({
    where: { messId, userId, date: { gte: startDate, lte: endDate } },
    select: { breakfast: true, lunch: true, dinner: true },
  });
  const guests = await prisma.guestMeal.aggregate({
    where: { messId, userId, date: { gte: startDate, lte: endDate } },
    _sum: { quantity: true },
  });

  const mealCount =
    requests.reduce((sum, r) => sum + r.breakfast + r.lunch + r.dinner, 0) + (guests._sum.quantity ?? 0);

  return { mealCount, charge: mealRate.times(mealCount) };
}

/** canSubmitMeal(): server-side deadline + payment-blocking enforcement. */
export async function canSubmitMeal(
  messId: string,
  userId: string,
  targetDateIso: string
): Promise<{ allowed: boolean; reason?: string }> {
  const settings = await prisma.messSettings.findUnique({ where: { messId } });
  if (!settings?.mealManagementEnabled) return { allowed: false, reason: "FEATURE_DISABLED" };

  const mess = await prisma.mess.findUniqueOrThrow({ where: { id: messId } });
  const { isMealDeadlinePassed } = await import("../utils/dates");
  const targetDate = new Date(targetDateIso);
  if (isMealDeadlinePassed(targetDate, settings.mealDeadlineHour, mess.timezone)) {
    return { allowed: false, reason: "MEAL_DEADLINE_PASSED" };
  }

  if (settings.blockMealsWhenOverdue) {
    const overdue = await isPaymentOverdue(messId, userId, settings.paymentGraceDays);
    if (overdue) return { allowed: false, reason: "PAYMENT_REQUIRED" };
  }

  return { allowed: true };
}

/** isPaymentOverdue(): derives from source ledger transactions, never a mutable "due" field. */
export async function isPaymentOverdue(messId: string, userId: string, graceDays: number): Promise<boolean> {
  const latestStatement = await prisma.monthlyStatement.findFirst({
    where: { messId, userId, status: "FINAL" },
    orderBy: { generatedAt: "desc" },
  });
  if (!latestStatement) return false;
  if (latestStatement.totalDue.lessThanOrEqualTo(0)) return false;

  const daysSince = Math.floor((Date.now() - latestStatement.generatedAt.getTime()) / (1000 * 60 * 60 * 24));
  return daysSince > graceDays;
}

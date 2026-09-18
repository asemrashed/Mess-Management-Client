import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { Errors } from "../lib/errors";
import { calculateMealPool, calculateMealRate, calculateTotalMeals, calculateMemberMealCost } from "./meal.service";

const ZERO = new Prisma.Decimal(0);

/**
 * closeAccountingPeriod(): transactional, idempotent, audited monthly close.
 * Flow: finalize meals/groceries -> meal pool -> meal rate -> member charges ->
 * other bills -> statements -> ledger entries -> close period. Section 29/46.
 */
export async function closeAccountingPeriod(messId: string, accountingPeriodId: string, closedById: string) {
  return prisma.$transaction(async (tx) => {
    const period = await tx.accountingPeriod.findUniqueOrThrow({ where: { id: accountingPeriodId } });
    if (period.messId !== messId) throw Errors.notFound("Accounting period");
    if (period.status === "CLOSED") throw Errors.accountingPeriodClosed();

    await tx.accountingPeriod.update({ where: { id: period.id }, data: { status: "CLOSING" } });

    const members = await tx.messMembership.findMany({
      where: { messId, status: "ACTIVE" },
      select: { userId: true },
    });

    const mealPool = await calculateMealPool(messId, accountingPeriodId);
    const totalMeals = await calculateTotalMeals(messId, period.startDate, period.endDate);
    const mealRate = calculateMealRate(mealPool, totalMeals);

    const bills = await tx.bill.findMany({
      where: { messId, accountingPeriodId },
      include: { assignments: true },
    });

    for (const member of members) {
      const { charge: mealCharge } = await calculateMemberMealCost(
        messId,
        member.userId,
        period.startDate,
        period.endDate,
        mealRate
      );

      const billCharge = bills.reduce((sum, bill) => {
        const assignment = bill.assignments.find((a) => a.userId === member.userId);
        return assignment ? sum.plus(assignment.amount) : sum;
      }, ZERO);

      const totalCharge = mealCharge.plus(billCharge);

      const paid = await tx.payment.aggregate({
        where: { messId, userId: member.userId },
        _sum: { amount: true },
      });
      const totalPaid = paid._sum.amount ?? ZERO;
      const totalDue = totalCharge.minus(totalPaid).greaterThan(0) ? totalCharge.minus(totalPaid) : ZERO;

      await tx.monthlyStatement.upsert({
        where: { accountingPeriodId_userId: { accountingPeriodId, userId: member.userId } },
        create: {
          messId,
          accountingPeriodId,
          userId: member.userId,
          mealCharge,
          billCharge,
          totalCharge,
          totalPaid,
          totalDue,
          status: "FINAL",
        },
        update: { mealCharge, billCharge, totalCharge, totalPaid, totalDue, status: "FINAL" },
      });

      await tx.ledgerTransaction.create({
        data: {
          messId,
          userId: member.userId,
          accountingPeriodId,
          type: "DEBIT",
          debit: totalCharge,
          credit: ZERO,
          referenceType: "MONTHLY_STATEMENT",
          referenceId: accountingPeriodId,
          description: `Monthly charges for ${period.year}-${String(period.month).padStart(2, "0")}`,
        },
      });
    }

    const closed = await tx.accountingPeriod.update({
      where: { id: period.id },
      data: { status: "CLOSED", closedAt: new Date(), closedById },
    });

    await tx.auditLog.create({
      data: {
        messId,
        userId: closedById,
        action: "CLOSE_ACCOUNTING_PERIOD",
        entityType: "AccountingPeriod",
        entityId: period.id,
        metadata: { mealPool: mealPool.toString(), totalMeals, mealRate: mealRate.toString() },
      },
    });

    return closed;
  });
}

/** calculateMemberBalance(): derived from ledger + payments, never a mutable field. */
export async function calculateMemberBalance(messId: string, userId: string) {
  const ledger = await prisma.ledgerTransaction.aggregate({
    where: { messId, userId },
    _sum: { debit: true, credit: true },
  });
  const debit = ledger._sum.debit ?? ZERO;
  const credit = ledger._sum.credit ?? ZERO;
  return debit.minus(credit);
}

/** calculateAdvanceBalance(): deposits/refunds increase; uses/adjustments as recorded. */
export async function calculateAdvanceBalance(messId: string, userId: string) {
  const txns = await prisma.advanceTransaction.findMany({ where: { messId, userId } });
  return txns.reduce((sum, t) => {
    if (t.type === "DEPOSIT" || t.type === "REFUND") return sum.plus(t.amount);
    return sum.minus(t.amount);
  }, ZERO);
}

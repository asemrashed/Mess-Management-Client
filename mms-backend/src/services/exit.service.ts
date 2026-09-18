import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { Errors } from "../lib/errors";
import { calculateAdvanceBalance, calculateMemberBalance } from "./accounting.service";

const ZERO = new Prisma.Decimal(0);

/**
 * calculateExitSettlement(): computes the components of an ExitFinancialSummary.
 * Rent/utility proration rules are Mess-configurable, not hard-coded globally.
 */
export async function calculateExitSettlement(messId: string, userId: string, exitDate: Date) {
  const settings = await prisma.messSettings.findUniqueOrThrow({ where: { messId } });

  const previousDue = await calculateMemberBalance(messId, userId);
  const advanceBalance = await calculateAdvanceBalance(messId, userId);

  // Prorate current month's rent up to the exit date, if rent is enabled.
  let rentCharges = ZERO;
  if (settings.rentEnabled && settings.monthlyRent) {
    const daysInMonth = new Date(exitDate.getFullYear(), exitDate.getMonth() + 1, 0).getDate();
    const dayOfExit = exitDate.getDate();
    rentCharges = settings.monthlyRent.times(dayOfExit).dividedBy(daysInMonth);
  }

  // Unbilled meal charges since the last closed period are approximated as zero here;
  // a full implementation should calculate from the currently OPEN period's meal pool.
  const mealCharges = ZERO;
  const utilityCharges = ZERO;
  const otherCharges = ZERO;

  const totalCharges = previousDue.plus(rentCharges).plus(mealCharges).plus(utilityCharges).plus(otherCharges);

  let advanceUsed = ZERO;
  let advanceRefund = ZERO;
  if (advanceBalance.greaterThan(totalCharges)) {
    advanceUsed = totalCharges;
    advanceRefund = advanceBalance.minus(totalCharges);
  } else {
    advanceUsed = advanceBalance;
  }

  const finalDue = totalCharges.minus(advanceUsed).greaterThan(0) ? totalCharges.minus(advanceUsed) : ZERO;

  return {
    mealCharges,
    rentCharges,
    utilityCharges,
    otherCharges,
    previousDue: previousDue.greaterThan(0) ? previousDue : ZERO,
    advanceUsed,
    advanceRefund,
    finalDue,
  };
}

export async function finalizeExit(messId: string, exitRequestId: string, reviewedById: string, approve: boolean) {
  return prisma.$transaction(async (tx) => {
    const exitRequest = await tx.exitRequest.findUniqueOrThrow({ where: { id: exitRequestId } });
    if (exitRequest.messId !== messId) throw Errors.notFound("Exit request");
    if (exitRequest.status !== "PENDING") throw Errors.conflict("Exit request already decided");

    if (!approve) {
      return tx.exitRequest.update({
        where: { id: exitRequestId },
        data: { status: "REJECTED", reviewedById, reviewedAt: new Date() },
      });
    }

    const settlement = await calculateExitSettlement(messId, exitRequest.userId, exitRequest.exitDate);

    await tx.exitFinancialSummary.create({
      data: { exitRequestId, ...settlement },
    });

    await tx.exitRequest.update({
      where: { id: exitRequestId },
      data: { status: "APPROVED", reviewedById, reviewedAt: new Date() },
    });

    await tx.messMembership.update({
      where: { messId_userId: { messId, userId: exitRequest.userId } },
      data: { status: "LEFT", leftAt: exitRequest.exitDate },
    });

    await tx.auditLog.create({
      data: {
        messId,
        userId: reviewedById,
        action: "APPROVE_EXIT",
        entityType: "ExitRequest",
        entityId: exitRequestId,
        metadata: { settlement: JSON.parse(JSON.stringify(settlement)) },
      },
    });

    return tx.exitRequest.findUniqueOrThrow({
      where: { id: exitRequestId },
      include: { summary: true },
    });
  });
}

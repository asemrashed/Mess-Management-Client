import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { Errors } from "../lib/errors";

const router = Router();

/** Verifies the shared CRON_SECRET on every scheduled-job endpoint. */
function requireCronSecret(req: any, _res: any, next: any) {
  const provided = req.headers["x-cron-secret"];
  if (!provided || provided !== process.env.CRON_SECRET) {
    return next(Errors.notAuthenticated());
  }
  next();
}

/**
 * POST /cron/manager-expiry - idempotent, cross-Mess sweep for expired Manager assignments.
 * Section 39: critical business rules never depend on this running; it's a convenience sweep.
 */
router.post(
  "/manager-expiry",
  requireCronSecret,
  asyncHandler(async (_req, res) => {
    const expired = await prisma.managerAssignment.findMany({
      where: { status: "ACTIVE", endDate: { lt: new Date() } },
    });

    for (const assignment of expired) {
      await prisma.$transaction([
        prisma.managerAssignment.update({ where: { id: assignment.id }, data: { status: "EXPIRED" } }),
        prisma.messMembership.update({
          where: { messId_userId: { messId: assignment.messId, userId: assignment.userId } },
          data: { role: "MEMBER" },
        }),
      ]);
    }

    res.json({ expiredCount: expired.length });
  })
);

export default router;

import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireMessMembership, requireRole } from "../middleware/tenant";
import { Errors } from "../lib/errors";
import { notify } from "../services/notification.service";

const router = Router({ mergeParams: true });
router.use(requireAuth, requireMessMembership);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const assignments = await prisma.managerAssignment.findMany({
      where: { messId: req.mess!.id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { startDate: "desc" },
    });
    res.json({ assignments });
  })
);

/** POST /mess/:messUsername/managers - ADMIN assigns a temporary Manager (default 1 month). */
router.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const userId = String(req.body.userId);
    const durationDays = Number(req.body.durationDays) || 30;
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const assignment = await prisma.$transaction(async (tx) => {
      await tx.managerAssignment.updateMany({
        where: { messId: req.mess!.id, status: "ACTIVE" },
        data: { status: "REVOKED" },
      });
      const created = await tx.managerAssignment.create({
        data: { messId: req.mess!.id, userId, assignedById: req.user!.id, startDate, endDate, status: "ACTIVE" },
      });
      await tx.messMembership.update({
        where: { messId_userId: { messId: req.mess!.id, userId } },
        data: { role: "MANAGER" },
      });
      return created;
    });

    await notify({
      messId: req.mess!.id,
      userId,
      type: "MANAGER_ASSIGNED",
      title: "You are now the Manager",
      message: `You've been assigned as Manager until ${endDate.toDateString()}.`,
    });

    res.status(201).json({ assignment });
  })
);

/**
 * POST /mess/:messUsername/managers/check-expiry - idempotent job endpoint. Can be called by
 * Vercel Cron, GitHub Actions, or manually; critical rules do not depend on this running.
 */
router.post(
  "/check-expiry",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const expired = await prisma.managerAssignment.findMany({
      where: { messId: req.mess!.id, status: "ACTIVE", endDate: { lt: new Date() } },
    });

    for (const assignment of expired) {
      await prisma.$transaction(async (tx) => {
        await tx.managerAssignment.update({ where: { id: assignment.id }, data: { status: "EXPIRED" } });
        await tx.messMembership.update({
          where: { messId_userId: { messId: req.mess!.id, userId: assignment.userId } },
          data: { role: "MEMBER" },
        });
      });
      await notify({
        messId: req.mess!.id,
        userId: req.user!.id,
        type: "MANAGER_EXPIRED",
        title: "Manager assignment expired",
        message: "The active Manager assignment has expired. Please assign a new Manager.",
      });
    }

    res.json({ expiredCount: expired.length });
  })
);

export default router;

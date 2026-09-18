import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireMessMembership } from "../middleware/tenant";
import { Errors } from "../lib/errors";

const router = Router({ mergeParams: true });
router.use(requireAuth, requireMessMembership);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const notifications = await prisma.notification.findMany({
      where: { messId: req.mess!.id, userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ notifications });
  })
);

router.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notification || notification.messId !== req.mess!.id || notification.userId !== req.user!.id) {
      throw Errors.notFound("Notification");
    }
    const updated = await prisma.notification.update({ where: { id: notification.id }, data: { readAt: new Date() } });
    res.json({ notification: updated });
  })
);

router.post(
  "/read-all",
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { messId: req.mess!.id, userId: req.user!.id, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ ok: true });
  })
);

export default router;

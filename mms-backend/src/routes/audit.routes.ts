import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireMessMembership, requireRole } from "../middleware/tenant";

const router = Router({ mergeParams: true });
router.use(requireAuth, requireMessMembership, requireRole("ADMIN"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const logs = await prisma.auditLog.findMany({
      where: { messId: req.mess!.id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json({ logs });
  })
);

export default router;

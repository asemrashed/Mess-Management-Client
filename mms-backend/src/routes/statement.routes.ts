import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireMessMembership } from "../middleware/tenant";
import { Errors } from "../lib/errors";

const router = Router({ mergeParams: true });
router.use(requireAuth, requireMessMembership);

/** GET /mess/:messUsername/statements - members see only their own; ADMIN sees all. */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const isAdmin = req.membership!.role === "ADMIN";
    const statements = await prisma.monthlyStatement.findMany({
      where: { messId: req.mess!.id, ...(isAdmin ? {} : { userId: req.user!.id }) },
      include: { accountingPeriod: true, user: { select: { id: true, name: true } } },
      orderBy: { generatedAt: "desc" },
    });
    res.json({ statements });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const statement = await prisma.monthlyStatement.findUnique({
      where: { id: req.params.id },
      include: { accountingPeriod: true, user: { select: { id: true, name: true } } },
    });
    if (!statement || statement.messId !== req.mess!.id) throw Errors.notFound("Statement");
    if (statement.userId !== req.user!.id && req.membership!.role !== "ADMIN") {
      throw Errors.insufficientPermission();
    }
    res.json({ statement });
  })
);

export default router;

import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireMessMembership, requireRole } from "../middleware/tenant";
import { requireFeature } from "../middleware/featureToggle";
import { Errors } from "../lib/errors";
import { createExitRequestSchema, decideExitRequestSchema } from "../validations/exit";
import { finalizeExit, calculateExitSettlement } from "../services/exit.service";

const router = Router({ mergeParams: true });
router.use(requireAuth, requireMessMembership, requireFeature("exitManagementEnabled"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const isAdmin = req.membership!.role === "ADMIN";
    const requests = await prisma.exitRequest.findMany({
      where: { messId: req.mess!.id, ...(isAdmin ? {} : { userId: req.user!.id }) },
      include: { summary: true, user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ requests });
  })
);

/** POST /mess/:messUsername/exit - any member submits a permanent exit request. */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createExitRequestSchema.parse(req.body);
    const request = await prisma.exitRequest.create({
      data: { messId: req.mess!.id, userId: req.user!.id, exitDate: new Date(input.exitDate), reason: input.reason },
    });
    res.status(201).json({ request });
  })
);

/** GET /mess/:messUsername/exit/:id/preview - ADMIN previews the settlement before deciding. */
router.get(
  "/:id/preview",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const exitRequest = await prisma.exitRequest.findUnique({ where: { id: req.params.id } });
    if (!exitRequest || exitRequest.messId !== req.mess!.id) throw Errors.notFound("Exit request");
    const settlement = await calculateExitSettlement(req.mess!.id, exitRequest.userId, exitRequest.exitDate);
    res.json({ settlement });
  })
);

/** PATCH /mess/:messUsername/exit/:id/decision - ADMIN approves (finalizes settlement) or rejects. */
router.patch(
  "/:id/decision",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const input = decideExitRequestSchema.parse(req.body);
    const result = await finalizeExit(req.mess!.id, req.params.id, req.user!.id, input.status === "APPROVED");
    res.json({ request: result });
  })
);

export default router;

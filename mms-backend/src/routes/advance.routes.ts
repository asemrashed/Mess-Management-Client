import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireMessMembership } from "../middleware/tenant";
import { createAdvanceSchema, updateAdvanceSchema } from "../validations/payment";
import { Errors } from "../lib/errors";
import { hasScope } from "../permissions";
import { audit } from "../services/notification.service";

const router = Router({ mergeParams: true });
router.use(requireAuth, requireMessMembership);

const include = {
  user: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
};

function canManageAdvances(req: { membership?: { role: any }; settings?: any }) {
  return hasScope(req.membership!.role, req.settings, "mealFinance");
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const staff = canManageAdvances(req);
    const transactions = await prisma.advanceTransaction.findMany({
      where: { messId: req.mess!.id, ...(staff ? {} : { userId: req.user!.id }) },
      include,
      orderBy: { createdAt: "desc" },
    });
    res.json({ transactions });
  })
);

/** POST /mess/:messUsername/advances - ADMIN, or MANAGER with meal-finance scope. */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    if (!canManageAdvances(req)) throw Errors.insufficientPermission();
    const input = createAdvanceSchema.parse(req.body);
    const transaction = await prisma.advanceTransaction.create({
      data: {
        messId: req.mess!.id,
        userId: input.userId,
        type: input.type,
        amount: input.amount,
        reference: input.reference,
        note: input.note,
        createdById: req.user!.id,
      },
      include,
    });
    res.status(201).json({ transaction });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!canManageAdvances(req)) throw Errors.insufficientPermission();
    const input = updateAdvanceSchema.parse(req.body);
    const existing = await prisma.advanceTransaction.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.messId !== req.mess!.id) throw Errors.notFound("Advance transaction");

    const transaction = await prisma.advanceTransaction.update({
      where: { id: existing.id },
      data: {
        ...(input.userId ? { userId: input.userId } : {}),
        ...(input.type ? { type: input.type } : {}),
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.reference !== undefined ? { reference: input.reference } : {}),
        ...(input.note !== undefined ? { note: input.note } : {}),
      },
      include,
    });

    await audit({
      messId: req.mess!.id,
      userId: req.user!.id,
      action: "UPDATE_ADVANCE",
      entityType: "AdvanceTransaction",
      entityId: existing.id,
    });

    res.json({ transaction });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!canManageAdvances(req)) throw Errors.insufficientPermission();
    const existing = await prisma.advanceTransaction.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.messId !== req.mess!.id) throw Errors.notFound("Advance transaction");

    await prisma.advanceTransaction.delete({ where: { id: existing.id } });

    await audit({
      messId: req.mess!.id,
      userId: req.user!.id,
      action: "DELETE_ADVANCE",
      entityType: "AdvanceTransaction",
      entityId: existing.id,
    });

    res.status(204).send();
  })
);

export default router;

import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireMessMembership } from "../middleware/tenant";
import { Errors } from "../lib/errors";
import { createPaymentSchema, updatePaymentSchema } from "../validations/payment";
import { calculateMemberBalance, calculateAdvanceBalance } from "../services/accounting.service";
import { allowedPaymentTypes, canManagePayment, hasScope } from "../permissions";
import { audit } from "../services/notification.service";
import { PaymentType } from "@prisma/client";

const router = Router({ mergeParams: true });
router.use(requireAuth, requireMessMembership);

const paymentInclude = {
  user: { select: { id: true, name: true } },
  recordedBy: { select: { id: true, name: true } },
};

/** GET /mess/:messUsername/payments - own payments, or all of the types the caller can manage. */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const role = req.membership!.role;
    const types = allowedPaymentTypes(role, req.settings);
    const where =
      role === "ADMIN"
        ? { messId: req.mess!.id }
        : types.length
          ? {
              messId: req.mess!.id,
              OR: [{ userId: req.user!.id }, { type: { in: types } }],
            }
          : { messId: req.mess!.id, userId: req.user!.id };

    const payments = await prisma.payment.findMany({
      where,
      include: paymentInclude,
      orderBy: { paymentDate: "desc" },
      take: 100,
    });
    res.json({ payments, allowedTypes: role === "ADMIN" ? ["MEAL", "RENT", "UTILITY", "GENERAL", "ADVANCE"] : types });
  })
);

/** GET /mess/:messUsername/payments/balance - the caller's own derived balance. */
router.get(
  "/balance",
  asyncHandler(async (req, res) => {
    const canViewOthers =
      req.membership!.role === "ADMIN" || hasScope(req.membership!.role, req.settings, "mealFinance");
    const targetUserId = canViewOthers && req.query.userId ? String(req.query.userId) : req.user!.id;
    const balance = await calculateMemberBalance(req.mess!.id, targetUserId);
    const advanceBalance = await calculateAdvanceBalance(req.mess!.id, targetUserId);
    res.json({ balanceDue: balance, advanceBalance });
  })
);

/** POST /mess/:messUsername/payments - ADMIN, or MANAGER for types they are allowed to record. */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createPaymentSchema.parse(req.body);
    if (!canManagePayment(req.membership!.role, req.settings, input.type)) {
      throw Errors.insufficientPermission();
    }

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          messId: req.mess!.id,
          userId: input.userId,
          amount: input.amount,
          type: input.type,
          paymentDate: input.paymentDate ? new Date(input.paymentDate) : undefined,
          reference: input.reference,
          note: input.note,
          recordedById: req.user!.id,
        },
        include: paymentInclude,
      });
      await tx.ledgerTransaction.create({
        data: {
          messId: req.mess!.id,
          userId: input.userId,
          type: "PAYMENT",
          debit: 0,
          credit: input.amount,
          referenceType: "Payment",
          referenceId: created.id,
          description: `${input.type} payment`,
        },
      });
      return created;
    });

    res.status(201).json({ payment });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = updatePaymentSchema.parse(req.body);
    const existing = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.messId !== req.mess!.id) throw Errors.notFound("Payment");
    if (!canManagePayment(req.membership!.role, req.settings, existing.type)) {
      throw Errors.insufficientPermission();
    }
    const nextType = (input.type ?? existing.type) as PaymentType;
    if (input.type && !canManagePayment(req.membership!.role, req.settings, nextType)) {
      throw Errors.insufficientPermission();
    }

    const payment = await prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: existing.id },
        data: {
          ...(input.userId ? { userId: input.userId } : {}),
          ...(input.amount !== undefined ? { amount: input.amount } : {}),
          ...(input.type ? { type: input.type } : {}),
          ...(input.paymentDate ? { paymentDate: new Date(input.paymentDate) } : {}),
          ...(input.reference !== undefined ? { reference: input.reference } : {}),
          ...(input.note !== undefined ? { note: input.note } : {}),
        },
        include: paymentInclude,
      });
      await tx.ledgerTransaction.updateMany({
        where: { referenceType: "Payment", referenceId: existing.id },
        data: {
          ...(input.userId ? { userId: input.userId } : {}),
          ...(input.amount !== undefined ? { credit: input.amount } : {}),
          description: `${nextType} payment`,
        },
      });
      return updated;
    });

    await audit({
      messId: req.mess!.id,
      userId: req.user!.id,
      action: "UPDATE_PAYMENT",
      entityType: "Payment",
      entityId: existing.id,
    });

    res.json({ payment });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.messId !== req.mess!.id) throw Errors.notFound("Payment");
    if (!canManagePayment(req.membership!.role, req.settings, existing.type)) {
      throw Errors.insufficientPermission();
    }

    await prisma.$transaction([
      prisma.ledgerTransaction.deleteMany({ where: { referenceType: "Payment", referenceId: existing.id } }),
      prisma.payment.delete({ where: { id: existing.id } }),
    ]);

    await audit({
      messId: req.mess!.id,
      userId: req.user!.id,
      action: "DELETE_PAYMENT",
      entityType: "Payment",
      entityId: existing.id,
    });

    res.status(204).send();
  })
);

export default router;

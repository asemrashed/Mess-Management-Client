import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireMessMembership } from "../middleware/tenant";
import { requireFeature } from "../middleware/featureToggle";
import { Errors } from "../lib/errors";
import { createBillSchema, updateBillSchema } from "../validations/bill";
import { ensureOpenPeriod } from "../lib/period";
import { billCategoryScope, hasScope } from "../permissions";
import { audit } from "../services/notification.service";

const router = Router({ mergeParams: true });
router.use(requireAuth, requireMessMembership, requireFeature("rentEnabled"));

function canManageBill(req: { membership?: { role: any }; settings?: any }, category: string) {
  return hasScope(req.membership!.role, req.settings, billCategoryScope(category));
}

async function buildAssignments(
  messId: string,
  input: { distributionMethod: "EQUAL" | "CUSTOM"; amount: number; customAssignments?: { userId: string; amount: number }[] }
) {
  if (input.distributionMethod === "EQUAL") {
    const members = await prisma.messMembership.findMany({
      where: { messId, status: "ACTIVE" },
    });
    if (!members.length) throw Errors.validation("No active members to split the bill");
    const share = new Prisma.Decimal(input.amount).dividedBy(members.length);
    return members.map((m) => ({ userId: m.userId, amount: share }));
  }
  if (!input.customAssignments?.length) throw Errors.validation("customAssignments required");
  return input.customAssignments.map((a) => ({ userId: a.userId, amount: new Prisma.Decimal(a.amount) }));
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const bills = await prisma.bill.findMany({
      where: { messId: req.mess!.id },
      include: { assignments: true, createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ bills });
  })
);

/** POST /mess/:messUsername/bills - ADMIN, or MANAGER for categories they are allowed to manage. */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createBillSchema.parse(req.body);
    if (!canManageBill(req, input.category)) throw Errors.insufficientPermission();

    const period = await ensureOpenPeriod(req.mess!.id);
    const assignments = await buildAssignments(req.mess!.id, input);

    const bill = await prisma.bill.create({
      data: {
        messId: req.mess!.id,
        accountingPeriodId: period.id,
        title: input.title,
        category: input.category,
        amount: input.amount,
        billingPeriod: input.billingPeriod,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        distributionMethod: input.distributionMethod,
        createdById: req.user!.id,
        assignments: { create: assignments },
      },
      include: { assignments: true },
    });

    res.status(201).json({ bill });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = updateBillSchema.parse(req.body);
    const existing = await prisma.bill.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.messId !== req.mess!.id) throw Errors.notFound("Bill");
    if (!canManageBill(req, existing.category)) throw Errors.insufficientPermission();
    const nextCategory = input.category ?? existing.category;
    if (input.category && !canManageBill(req, nextCategory)) throw Errors.insufficientPermission();

    const amount = input.amount ?? Number(existing.amount);
    const distributionMethod = input.distributionMethod ?? existing.distributionMethod;
    const shouldResplit = input.amount !== undefined || input.distributionMethod !== undefined || input.customAssignments !== undefined;

    const bill = await prisma.$transaction(async (tx) => {
      if (shouldResplit) {
        await tx.billAssignment.deleteMany({ where: { billId: existing.id } });
        const assignments = await buildAssignments(req.mess!.id, {
          distributionMethod,
          amount,
          customAssignments: input.customAssignments,
        });
        await tx.billAssignment.createMany({
          data: assignments.map((a) => ({ billId: existing.id, userId: a.userId, amount: a.amount })),
        });
      }
      return tx.bill.update({
        where: { id: existing.id },
        data: {
          ...(input.title ? { title: input.title } : {}),
          ...(input.category ? { category: input.category } : {}),
          ...(input.amount !== undefined ? { amount: input.amount } : {}),
          ...(input.billingPeriod ? { billingPeriod: input.billingPeriod } : {}),
          ...(input.dueDate ? { dueDate: new Date(input.dueDate) } : {}),
          ...(input.distributionMethod ? { distributionMethod: input.distributionMethod } : {}),
        },
        include: { assignments: true, createdBy: { select: { id: true, name: true } } },
      });
    });

    await audit({
      messId: req.mess!.id,
      userId: req.user!.id,
      action: "UPDATE_BILL",
      entityType: "Bill",
      entityId: existing.id,
    });

    res.json({ bill });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.bill.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.messId !== req.mess!.id) throw Errors.notFound("Bill");
    if (!canManageBill(req, existing.category)) throw Errors.insufficientPermission();

    await prisma.bill.delete({ where: { id: existing.id } });

    await audit({
      messId: req.mess!.id,
      userId: req.user!.id,
      action: "DELETE_BILL",
      entityType: "Bill",
      entityId: existing.id,
    });

    res.status(204).send();
  })
);

export default router;

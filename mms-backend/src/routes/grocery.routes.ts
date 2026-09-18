import { Router, Request } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireMessMembership } from "../middleware/tenant";
import { requireFeature } from "../middleware/featureToggle";
import { Errors } from "../lib/errors";
import { createGrocerySchema, decideGrocerySchema, updateGrocerySchema } from "../validations/grocery";
import { audit, notify } from "../services/notification.service";
import { ensureOpenPeriod } from "../lib/period";
import { hasScope } from "../permissions";

const router = Router({ mergeParams: true });
router.use(requireAuth, requireMessMembership, requireFeature("groceryEnabled"));

function purchaseTitle(items: { product: string }[]) {
  const names = items.map((i) => i.product.trim());
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
}

const purchaseInclude = {
  createdBy: { select: { id: true, name: true } },
  category: true,
  items: { orderBy: { sortOrder: "asc" as const } },
};

function canApproveGrocery(req: Request) {
  return hasScope(req.membership!.role, req.settings, "grocery");
}

function canEditPurchase(req: Request, purchase: { createdById: string; status: string }) {
  if (canApproveGrocery(req)) return true;
  return purchase.createdById === req.user!.id && purchase.status === "PENDING";
}

/** GET /mess/:messUsername/groceries?status=PENDING - list purchases, any member. */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const purchases = await prisma.groceryPurchase.findMany({
      where: { messId: req.mess!.id, ...(status ? { status: status as any } : {}) },
      include: purchaseInclude,
      orderBy: { purchaseDate: "desc" },
      take: 100,
    });
    res.json({ purchases });
  })
);

/** POST /mess/:messUsername/groceries - any member submits an actual purchase; starts PENDING unless staff auto-approves. */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createGrocerySchema.parse(req.body);
    const period = await ensureOpenPeriod(req.mess!.id);
    const amount = input.items.reduce((sum, item) => sum + item.price, 0);
    const first = input.items[0];
    const autoApprove = canApproveGrocery(req);

    const purchase = await prisma.groceryPurchase.create({
      data: {
        messId: req.mess!.id,
        accountingPeriodId: period.id,
        createdById: req.user!.id,
        categoryId: input.categoryId,
        title: purchaseTitle(input.items),
        amount,
        quantity: first.quantity,
        unit: first.unit,
        purchaseDate: new Date(input.purchaseDate),
        paymentSourceUserId: input.paymentSourceUserId ?? req.user!.id,
        note: input.note,
        status: autoApprove ? "APPROVED" : "PENDING",
        approvedById: autoApprove ? req.user!.id : undefined,
        approvedAt: autoApprove ? new Date() : undefined,
        items: {
          create: input.items.map((item, index) => ({
            product: item.product.trim(),
            quantity: item.quantity,
            unit: item.unit,
            price: item.price,
            sortOrder: index,
          })),
        },
      },
      include: purchaseInclude,
    });

    res.status(201).json({ purchase });
  })
);

/** PATCH /mess/:messUsername/groceries/:id - staff, or the member who submitted while still PENDING. */
router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = updateGrocerySchema.parse(req.body);
    const purchase = await prisma.groceryPurchase.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!purchase || purchase.messId !== req.mess!.id) throw Errors.notFound("Grocery purchase");
    if (!canEditPurchase(req, purchase)) throw Errors.insufficientPermission();

    const items = input.items;
    const amount = items ? items.reduce((sum, item) => sum + item.price, 0) : undefined;
    const first = items?.[0];

    const updated = await prisma.$transaction(async (tx) => {
      if (items) {
        await tx.groceryPurchaseItem.deleteMany({ where: { purchaseId: purchase.id } });
        await tx.groceryPurchaseItem.createMany({
          data: items.map((item, index) => ({
            purchaseId: purchase.id,
            product: item.product.trim(),
            quantity: item.quantity,
            unit: item.unit,
            price: item.price,
            sortOrder: index,
          })),
        });
      }
      return tx.groceryPurchase.update({
        where: { id: purchase.id },
        data: {
          ...(input.purchaseDate ? { purchaseDate: new Date(input.purchaseDate) } : {}),
          ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
          ...(input.paymentSourceUserId !== undefined ? { paymentSourceUserId: input.paymentSourceUserId } : {}),
          ...(input.note !== undefined ? { note: input.note } : {}),
          ...(items
            ? {
                title: purchaseTitle(items),
                amount,
                quantity: first?.quantity,
                unit: first?.unit,
              }
            : {}),
        },
        include: purchaseInclude,
      });
    });

    await audit({
      messId: req.mess!.id,
      userId: req.user!.id,
      action: "UPDATE_GROCERY",
      entityType: "GroceryPurchase",
      entityId: purchase.id,
    });

    res.json({ purchase: updated });
  })
);

/** DELETE /mess/:messUsername/groceries/:id */
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const purchase = await prisma.groceryPurchase.findUnique({ where: { id: req.params.id } });
    if (!purchase || purchase.messId !== req.mess!.id) throw Errors.notFound("Grocery purchase");
    if (!canEditPurchase(req, purchase)) throw Errors.insufficientPermission();

    await prisma.groceryPurchase.delete({ where: { id: purchase.id } });

    await audit({
      messId: req.mess!.id,
      userId: req.user!.id,
      action: "DELETE_GROCERY",
      entityType: "GroceryPurchase",
      entityId: purchase.id,
    });

    res.status(204).send();
  })
);

/** PATCH /mess/:messUsername/groceries/:id/decision - MANAGER/ADMIN with grocery scope approves or rejects. */
router.patch(
  "/:id/decision",
  asyncHandler(async (req, res) => {
    if (!canApproveGrocery(req)) throw Errors.insufficientPermission();
    const input = decideGrocerySchema.parse(req.body);
    const purchase = await prisma.groceryPurchase.findUnique({ where: { id: req.params.id } });
    if (!purchase || purchase.messId !== req.mess!.id) throw Errors.notFound("Grocery purchase");
    if (purchase.status !== "PENDING") throw Errors.groceryAlreadyApproved();

    const updated = await prisma.groceryPurchase.update({
      where: { id: purchase.id },
      data: { status: input.status, approvedById: req.user!.id, approvedAt: new Date() },
      include: purchaseInclude,
    });

    await notify({
      messId: req.mess!.id,
      userId: purchase.createdById,
      type: "GROCERY_DECISION",
      title: `Grocery purchase ${input.status.toLowerCase()}`,
      message: `Your purchase "${purchase.title}" was ${input.status.toLowerCase()}.`,
      referenceType: "GroceryPurchase",
      referenceId: purchase.id,
    });

    await audit({
      messId: req.mess!.id,
      userId: req.user!.id,
      action: `GROCERY_${input.status}`,
      entityType: "GroceryPurchase",
      entityId: purchase.id,
    });

    res.json({ purchase: updated });
  })
);

export default router;

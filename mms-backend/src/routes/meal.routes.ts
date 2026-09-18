import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireMessMembership } from "../middleware/tenant";
import { requireFeature } from "../middleware/featureToggle";
import { Errors } from "../lib/errors";
import { submitMealSchema, overrideMealSchema, guestMealSchema } from "../validations/meal";
import { canSubmitMeal } from "../services/meal.service";
import { audit } from "../services/notification.service";
import { hasScope } from "../permissions";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireMessMembership, requireFeature("mealManagementEnabled"));

function canManageMeals(req: { membership?: { role: any }; settings?: any }) {
  return hasScope(req.membership!.role, req.settings, "meals");
}

/** GET /mess/:messUsername/meals?date=YYYY-MM-DD - the meal board for a given date, all members. */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const date = new Date(String(req.query.date ?? new Date().toISOString().slice(0, 10)));
    const requests = await prisma.mealRequest.findMany({
      where: { messId: req.mess!.id, date },
      include: { user: { select: { id: true, name: true, image: true } } },
    });
    const guestMeals = await prisma.guestMeal.findMany({
      where: { messId: req.mess!.id, date },
      include: { user: { select: { id: true, name: true } } },
    });
    res.json({ date, requests, guestMeals });
  })
);

/** GET /mess/:messUsername/meals/mine - the caller's own meal history. */
router.get(
  "/mine",
  asyncHandler(async (req, res) => {
    const requests = await prisma.mealRequest.findMany({
      where: { messId: req.mess!.id, userId: req.user!.id },
      orderBy: { date: "desc" },
      take: 60,
    });
    res.json({ requests });
  })
);

/** POST /mess/:messUsername/meals - submit/update a meal. Staff with meals scope can set any member's meals. */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = submitMealSchema.parse(req.body);
    const staff = canManageMeals(req);
    const targetUserId = staff && input.userId ? input.userId : req.user!.id;

    if (targetUserId !== req.user!.id && !staff) throw Errors.insufficientPermission();

    if (!staff || targetUserId === req.user!.id) {
      const check = await canSubmitMeal(req.mess!.id, targetUserId, input.date);
      if (!check.allowed && !staff) {
        if (check.reason === "MEAL_DEADLINE_PASSED") throw Errors.mealDeadlinePassed();
        if (check.reason === "PAYMENT_REQUIRED") throw Errors.paymentRequired();
        throw Errors.featureDisabled("mealManagementEnabled");
      }
    }

    const mealRequest = await prisma.mealRequest.upsert({
      where: { messId_userId_date: { messId: req.mess!.id, userId: targetUserId, date: new Date(input.date) } },
      create: {
        messId: req.mess!.id,
        userId: targetUserId,
        date: new Date(input.date),
        breakfast: input.breakfast,
        lunch: input.lunch,
        dinner: input.dinner,
        status: staff && targetUserId !== req.user!.id ? "OVERRIDDEN" : "SUBMITTED",
      },
      update: {
        breakfast: input.breakfast,
        lunch: input.lunch,
        dinner: input.dinner,
        ...(staff && targetUserId !== req.user!.id ? { status: "OVERRIDDEN" as const } : {}),
      },
    });

    res.status(201).json({ mealRequest });
  })
);

/** PATCH /mess/:messUsername/meals/:mealRequestId/override - staff with meals scope. Audited. */
router.patch(
  "/:mealRequestId/override",
  asyncHandler(async (req, res) => {
    if (!canManageMeals(req)) throw Errors.insufficientPermission();
    const input = overrideMealSchema.parse(req.body);
    const existing = await prisma.mealRequest.findUnique({ where: { id: req.params.mealRequestId } });
    if (!existing || existing.messId !== req.mess!.id) throw Errors.notFound("Meal request");

    const oldValue = { breakfast: existing.breakfast, lunch: existing.lunch, dinner: existing.dinner };
    const newValue = {
      breakfast: input.breakfast ?? existing.breakfast,
      lunch: input.lunch ?? existing.lunch,
      dinner: input.dinner ?? existing.dinner,
    };

    const [updated] = await prisma.$transaction([
      prisma.mealRequest.update({
        where: { id: existing.id },
        data: { ...newValue, status: "OVERRIDDEN" },
      }),
      prisma.mealOverride.create({
        data: {
          messId: req.mess!.id,
          mealRequestId: existing.id,
          changedById: req.user!.id,
          oldValue,
          newValue,
          reason: input.reason,
        },
      }),
    ]);

    await audit({
      messId: req.mess!.id,
      userId: req.user!.id,
      action: "OVERRIDE_MEAL",
      entityType: "MealRequest",
      entityId: existing.id,
      metadata: { oldValue, newValue, reason: input.reason },
    });

    res.json({ mealRequest: updated });
  })
);

/** DELETE /mess/:messUsername/meals/:mealRequestId */
router.delete(
  "/:mealRequestId",
  asyncHandler(async (req, res) => {
    const existing = await prisma.mealRequest.findUnique({ where: { id: req.params.mealRequestId } });
    if (!existing || existing.messId !== req.mess!.id) throw Errors.notFound("Meal request");
    const staff = canManageMeals(req);
    if (!staff && existing.userId !== req.user!.id) throw Errors.insufficientPermission();
    if (!staff) {
      const check = await canSubmitMeal(req.mess!.id, req.user!.id, existing.date.toISOString().slice(0, 10));
      if (!check.allowed) throw Errors.insufficientPermission();
    }

    await prisma.mealRequest.delete({ where: { id: existing.id } });
    await audit({
      messId: req.mess!.id,
      userId: req.user!.id,
      action: "DELETE_MEAL",
      entityType: "MealRequest",
      entityId: existing.id,
    });
    res.status(204).send();
  })
);

/** POST /mess/:messUsername/meals/guest - request a guest meal, if enabled. */
router.post(
  "/guest",
  asyncHandler(async (req, res) => {
    const settings = await prisma.messSettings.findUniqueOrThrow({ where: { messId: req.mess!.id } });
    if (!settings.guestMealsEnabled) throw Errors.featureDisabled("guestMealsEnabled");

    const input = guestMealSchema.parse(req.body);
    const guestMeal = await prisma.guestMeal.create({
      data: {
        messId: req.mess!.id,
        userId: req.user!.id,
        date: new Date(input.date),
        mealType: input.mealType,
        quantity: input.quantity,
        guestName: input.guestName,
      },
    });
    res.status(201).json({ guestMeal });
  })
);

router.patch(
  "/guest/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.guestMeal.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.messId !== req.mess!.id) throw Errors.notFound("Guest meal");
    const staff = canManageMeals(req);
    if (!staff && existing.userId !== req.user!.id) throw Errors.insufficientPermission();

    const input = guestMealSchema.partial().parse(req.body);
    const updated = await prisma.guestMeal.update({
      where: { id: existing.id },
      data: {
        ...(input.date ? { date: new Date(input.date) } : {}),
        ...(input.mealType ? { mealType: input.mealType } : {}),
        ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
        ...(input.guestName !== undefined ? { guestName: input.guestName } : {}),
      },
    });
    res.json({ guestMeal: updated });
  })
);

router.delete(
  "/guest/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.guestMeal.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.messId !== req.mess!.id) throw Errors.notFound("Guest meal");
    const staff = canManageMeals(req);
    if (!staff && existing.userId !== req.user!.id) throw Errors.insufficientPermission();
    await prisma.guestMeal.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

export default router;

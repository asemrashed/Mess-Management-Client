import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireMessMembership, requireRole } from "../middleware/tenant";

const router = Router({ mergeParams: true });
router.use(requireAuth, requireMessMembership, requireRole("ADMIN"));

/** GET /mess/:messUsername/reports/meals?periodId=... - meal report summary. */
router.get(
  "/meals",
  asyncHandler(async (req, res) => {
    const periodId = String(req.query.periodId ?? "");
    const period = periodId
      ? await prisma.accountingPeriod.findUnique({ where: { id: periodId } })
      : await prisma.accountingPeriod.findFirst({ where: { messId: req.mess!.id }, orderBy: { startDate: "desc" } });
    if (!period) return res.json({ memberTotals: [], mealRate: 0, totalMeals: 0 });

    const requests = await prisma.mealRequest.findMany({
      where: { messId: req.mess!.id, date: { gte: period.startDate, lte: period.endDate } },
      include: { user: { select: { id: true, name: true } } },
    });

    const totalsByUser = new Map<string, { name: string; breakfast: number; lunch: number; dinner: number }>();
    for (const r of requests) {
      const cur = totalsByUser.get(r.userId) ?? { name: r.user.name, breakfast: 0, lunch: 0, dinner: 0 };
      cur.breakfast += r.breakfast;
      cur.lunch += r.lunch;
      cur.dinner += r.dinner;
      totalsByUser.set(r.userId, cur);
    }

    const memberTotals = Array.from(totalsByUser.entries()).map(([userId, t]) => ({
      userId,
      ...t,
      total: t.breakfast + t.lunch + t.dinner,
    }));

    res.json({ period, memberTotals });
  })
);

/** GET /mess/:messUsername/reports/finance?periodId=... - finance report summary. */
router.get(
  "/finance",
  asyncHandler(async (req, res) => {
    const periodId = String(req.query.periodId ?? "");
    const statements = await prisma.monthlyStatement.findMany({
      where: { messId: req.mess!.id, ...(periodId ? { accountingPeriodId: periodId } : {}) },
      include: { user: { select: { id: true, name: true } } },
    });
    res.json({ statements });
  })
);

/** GET /mess/:messUsername/reports/groceries.csv - CSV export of groceries. */
router.get(
  "/groceries.csv",
  asyncHandler(async (req, res) => {
    const purchases = await prisma.groceryPurchase.findMany({
      where: { messId: req.mess!.id },
      include: { createdBy: { select: { name: true } } },
      orderBy: { purchaseDate: "desc" },
    });

    const header = "Date,Title,Amount,Status,SubmittedBy\n";
    const rows = purchases
      .map(
        (p) =>
          `${p.purchaseDate.toISOString().slice(0, 10)},"${p.title.replace(/"/g, '""')}",${p.amount},${p.status},"${p.createdBy.name}"`
      )
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=groceries.csv");
    res.send(header + rows);
  })
);

export default router;

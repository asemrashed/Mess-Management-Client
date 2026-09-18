import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireMessMembership, requireRole } from "../middleware/tenant";
import { Errors } from "../lib/errors";
import { startOfMonth, endOfMonth } from "../utils/dates";
import { closeAccountingPeriod } from "../services/accounting.service";

const router = Router({ mergeParams: true });
router.use(requireAuth, requireMessMembership);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const periods = await prisma.accountingPeriod.findMany({
      where: { messId: req.mess!.id },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    res.json({ periods });
  })
);

/** POST /mess/:messUsername/periods - ADMIN opens a new period; a Mess has at most one per year/month. */
router.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const year = Number(req.body.year);
    const month = Number(req.body.month);
    if (!year || !month || month < 1 || month > 12) throw Errors.validation("Invalid year/month");

    const existing = await prisma.accountingPeriod.findUnique({
      where: { messId_year_month: { messId: req.mess!.id, year, month } },
    });
    if (existing) throw Errors.conflict("Period already exists");

    const period = await prisma.accountingPeriod.create({
      data: {
        messId: req.mess!.id,
        year,
        month,
        startDate: startOfMonth(year, month),
        endDate: endOfMonth(year, month),
        status: "OPEN",
      },
    });
    res.status(201).json({ period });
  })
);

/** POST /mess/:messUsername/periods/:id/close - ADMIN only. Transactional, idempotent, audited. */
router.post(
  "/:id/close",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const closed = await closeAccountingPeriod(req.mess!.id, req.params.id, req.user!.id);
    res.json({ period: closed });
  })
);

export default router;

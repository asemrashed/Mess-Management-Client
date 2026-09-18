import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireMessMembership, requireRole } from "../middleware/tenant";
import { createRuleSchema, updateRuleSchema } from "../validations/rule";
import { Errors } from "../lib/errors";

const router = Router({ mergeParams: true });
router.use(requireAuth, requireMessMembership);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const rules = await prisma.rule.findMany({ where: { messId: req.mess!.id }, orderBy: { category: "asc" } });
    res.json({ rules });
  })
);

router.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const input = createRuleSchema.parse(req.body);
    const rule = await prisma.rule.create({
      data: { messId: req.mess!.id, ...input, createdById: req.user!.id },
    });
    res.status(201).json({ rule });
  })
);

router.patch(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const input = updateRuleSchema.parse(req.body);
    const existing = await prisma.rule.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.messId !== req.mess!.id) throw Errors.notFound("Rule");
    const rule = await prisma.rule.update({ where: { id: existing.id }, data: input });
    res.json({ rule });
  })
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.rule.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.messId !== req.mess!.id) throw Errors.notFound("Rule");
    await prisma.rule.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

export default router;

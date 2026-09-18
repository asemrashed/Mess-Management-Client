import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireMessMembership } from "../middleware/tenant";
import { requireFeature } from "../middleware/featureToggle";
import { Errors } from "../lib/errors";
import { createNoteSchema, updateNoteSchema } from "../validations/note";
import { isStaff } from "../permissions";

const router = Router({ mergeParams: true });
router.use(requireAuth, requireMessMembership, requireFeature("notesEnabled"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const notes = await prisma.note.findMany({
      where: { messId: req.mess!.id, status: { not: "ARCHIVED" } },
      include: {
        createdBy: { select: { id: true, name: true } },
        completedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ notes });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createNoteSchema.parse(req.body);
    const note = await prisma.note.create({
      data: { messId: req.mess!.id, title: input.title, createdById: req.user!.id },
    });
    res.status(201).json({ note });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = updateNoteSchema.parse(req.body);
    const note = await prisma.note.findUnique({ where: { id: req.params.id } });
    if (!note || note.messId !== req.mess!.id) throw Errors.notFound("Note");
    if (!isStaff(req.membership!.role) && note.createdById !== req.user!.id) {
      throw Errors.insufficientPermission();
    }
    const updated = await prisma.note.update({
      where: { id: note.id },
      data: { title: input.title },
    });
    res.json({ note: updated });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const note = await prisma.note.findUnique({ where: { id: req.params.id } });
    if (!note || note.messId !== req.mess!.id) throw Errors.notFound("Note");
    if (!isStaff(req.membership!.role) && note.createdById !== req.user!.id) {
      throw Errors.insufficientPermission();
    }
    await prisma.note.delete({ where: { id: note.id } });
    res.status(204).send();
  })
);

router.patch(
  "/:id/complete",
  asyncHandler(async (req, res) => {
    const note = await prisma.note.findUnique({ where: { id: req.params.id } });
    if (!note || note.messId !== req.mess!.id) throw Errors.notFound("Note");
    const updated = await prisma.note.update({
      where: { id: note.id },
      data: { status: "COMPLETED", completedById: req.user!.id, completedAt: new Date() },
    });
    res.json({ note: updated });
  })
);

router.patch(
  "/:id/archive",
  asyncHandler(async (req, res) => {
    const note = await prisma.note.findUnique({ where: { id: req.params.id } });
    if (!note || note.messId !== req.mess!.id) throw Errors.notFound("Note");
    if (!isStaff(req.membership!.role) && note.createdById !== req.user!.id) {
      throw Errors.insufficientPermission();
    }
    const updated = await prisma.note.update({ where: { id: note.id }, data: { status: "ARCHIVED" } });
    res.json({ note: updated });
  })
);

export default router;

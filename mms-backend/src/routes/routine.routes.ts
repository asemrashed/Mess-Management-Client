import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireMessMembership, requireRole } from "../middleware/tenant";
import { requireFeature } from "../middleware/featureToggle";
import { Errors } from "../lib/errors";
import { createRoutineSchema } from "../validations/routine";

const router = Router({ mergeParams: true });
router.use(requireAuth, requireMessMembership, requireFeature("routinesEnabled"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const routines = await prisma.routine.findMany({
      where: { messId: req.mess!.id },
      include: {
        assignments: {
          include: { user: { select: { id: true, name: true } }, completion: true },
          orderBy: { dueDate: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ routines });
  })
);

/** POST /mess/:messUsername/routines - ADMIN defines a recurring task with an initial rotation. */
router.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const input = createRoutineSchema.parse(req.body);
    const routine = await prisma.routine.create({
      data: {
        messId: req.mess!.id,
        title: input.title,
        recurrenceRule: input.recurrenceRule,
        rotateMembers: input.rotateMembers,
        createdById: req.user!.id,
        assignments: {
          create: input.assignments.map((a) => ({
            userId: a.userId,
            periodLabel: a.periodLabel,
            dueDate: new Date(a.dueDate),
          })),
        },
      },
      include: { assignments: true },
    });
    res.status(201).json({ routine });
  })
);

/** PATCH /mess/:messUsername/routines/assignments/:id/complete - assigned member marks done. */
router.patch(
  "/assignments/:id/complete",
  asyncHandler(async (req, res) => {
    const assignment = await prisma.routineAssignment.findUnique({
      where: { id: req.params.id },
      include: { routine: true },
    });
    if (!assignment || assignment.routine.messId !== req.mess!.id) throw Errors.notFound("Assignment");
    if (assignment.userId !== req.user!.id && req.membership!.role === "MEMBER") {
      throw Errors.insufficientPermission();
    }

    const [updated] = await prisma.$transaction([
      prisma.routineAssignment.update({ where: { id: assignment.id }, data: { status: "COMPLETED" } }),
      prisma.routineCompletion.create({
        data: { routineAssignmentId: assignment.id, userId: req.user!.id, note: req.body?.note },
      }),
    ]);

    res.json({ assignment: updated });
  })
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.routine.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.messId !== req.mess!.id) throw Errors.notFound("Routine");
    await prisma.routine.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

export default router;

import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireMessMembership } from "../middleware/tenant";
import { requireFeature } from "../middleware/featureToggle";
import { Errors } from "../lib/errors";
import { createPollSchema, voteSchema, updatePollSchema } from "../validations/poll";

const router = Router({ mergeParams: true });
router.use(requireAuth, requireMessMembership, requireFeature("pollsEnabled"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const polls = await prisma.poll.findMany({
      where: { messId: req.mess!.id },
      include: { options: { include: { votes: true } }, createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ polls });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createPollSchema.parse(req.body);
    const poll = await prisma.poll.create({
      data: {
        messId: req.mess!.id,
        question: input.question,
        choiceType: input.choiceType,
        anonymous: input.anonymous,
        endAt: input.endAt ? new Date(input.endAt) : undefined,
        createdById: req.user!.id,
        options: { create: input.options.map((text) => ({ text })) },
      },
      include: { options: true },
    });
    res.status(201).json({ poll });
  })
);

router.post(
  "/:id/vote",
  asyncHandler(async (req, res) => {
    const input = voteSchema.parse(req.body);
    const poll = await prisma.poll.findUnique({ where: { id: req.params.id }, include: { options: true } });
    if (!poll || poll.messId !== req.mess!.id) throw Errors.notFound("Poll");
    if (poll.endAt && poll.endAt < new Date()) throw Errors.pollClosed();
    if (poll.choiceType === "SINGLE" && input.optionIds.length > 1) {
      throw Errors.validation("This poll only allows one choice");
    }

    const validOptionIds = new Set(poll.options.map((o) => o.id));
    for (const optionId of input.optionIds) {
      if (!validOptionIds.has(optionId)) throw Errors.validation("Invalid option");
    }

    try {
      await prisma.$transaction(
        input.optionIds.map((optionId) =>
          prisma.pollVote.create({ data: { optionId, userId: req.user!.id } })
        )
      );
    } catch (err: any) {
      if (err?.code === "P2002") throw Errors.alreadyVoted();
      throw err;
    }

    res.status(201).json({ ok: true });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const poll = await prisma.poll.findUnique({ where: { id: req.params.id } });
    if (!poll || poll.messId !== req.mess!.id) throw Errors.notFound("Poll");
    if (req.membership!.role === "MEMBER" && poll.createdById !== req.user!.id) {
      throw Errors.insufficientPermission();
    }
    const input = updatePollSchema.parse(req.body);
    const updated = await prisma.poll.update({
      where: { id: poll.id },
      data: {
        ...(input.question ? { question: input.question } : {}),
        ...(input.endAt !== undefined ? { endAt: input.endAt ? new Date(input.endAt) : null } : {}),
      },
      include: { options: { include: { votes: true } }, createdBy: { select: { id: true, name: true } } },
    });
    res.json({ poll: updated });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const poll = await prisma.poll.findUnique({ where: { id: req.params.id } });
    if (!poll || poll.messId !== req.mess!.id) throw Errors.notFound("Poll");
    if (req.membership!.role === "MEMBER" && poll.createdById !== req.user!.id) {
      throw Errors.insufficientPermission();
    }
    await prisma.poll.delete({ where: { id: poll.id } });
    res.status(204).send();
  })
);

export default router;

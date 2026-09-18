import { Router } from "express";
import { nanoid } from "nanoid";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireMessMembership, requireRole } from "../middleware/tenant";
import { Errors } from "../lib/errors";
import { createMessSchema, joinByCodeSchema, updateMessSettingsSchema, createInvitationSchema } from "../validations/mess";
import { audit } from "../services/notification.service";
import { sendMessInvitationEmail } from "../lib/mailer";
import { startOfMonth, endOfMonth } from "../utils/dates";
import { publicPermissions } from "../permissions";

const router = Router();

/** POST /mess - any authenticated user can create a Mess; creator becomes ADMIN. */
router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = createMessSchema.parse(req.body);

    const existing = await prisma.mess.findUnique({ where: { username: input.username } });
    if (existing) throw Errors.conflict("That Mess username is already taken");

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const mess = await prisma.$transaction(async (tx) => {
      const created = await tx.mess.create({
        data: {
          name: input.name,
          username: input.username,
          description: input.description,
          address: input.address,
          contactNumber: input.contactNumber,
          joinCode: nanoid(8),
          createdById: req.user!.id,
        },
      });
      await tx.messSettings.create({ data: { messId: created.id } });
      await tx.messMembership.create({
        data: { messId: created.id, userId: req.user!.id, role: "ADMIN" },
      });
      await tx.accountingPeriod.create({
        data: {
          messId: created.id,
          year,
          month,
          startDate: startOfMonth(year, month),
          endDate: endOfMonth(year, month),
          status: "OPEN",
        },
      });
      return created;
    });

    res.status(201).json({ mess });
  })
);

/** POST /mess/join/code - join by username + join code. Rate-limited at the app level. */
router.post(
  "/join/code",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = joinByCodeSchema.parse(req.body);
    const mess = await prisma.mess.findUnique({ where: { username: input.username } });
    if (!mess || !mess.joinCodeEnabled || mess.joinCode !== input.joinCode) {
      throw Errors.invalidJoinCode();
    }

    const membership = await prisma.messMembership.upsert({
      where: { messId_userId: { messId: mess.id, userId: req.user!.id } },
      create: { messId: mess.id, userId: req.user!.id, role: "MEMBER" },
      update: { status: "ACTIVE", leftAt: null },
    });

    res.status(201).json({ membership, mess });
  })
);

/** POST /mess/join/invite/:token - join via invitation link. */
router.post(
  "/join/invite/:token",
  requireAuth,
  asyncHandler(async (req, res) => {
    const invitation = await prisma.messInvitation.findUnique({
      where: { token: req.params.token },
      include: { mess: { select: { id: true, name: true, username: true } } },
    });
    if (!invitation || invitation.status !== "ACTIVE" || invitation.expiresAt < new Date()) {
      throw Errors.invalidInvitation();
    }
    if (invitation.email && invitation.email.toLowerCase() !== req.user!.email.toLowerCase()) {
      throw Errors.invalidInvitation();
    }

    const membership = await prisma.messMembership.upsert({
      where: { messId_userId: { messId: invitation.messId, userId: req.user!.id } },
      create: { messId: invitation.messId, userId: req.user!.id, role: "MEMBER" },
      update: { status: "ACTIVE", leftAt: null },
    });

    await prisma.messInvitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    res.status(201).json({ membership, mess: invitation.mess });
  })
);

/** GET /mess/:messUsername - basic Mess info, any member. */
router.get(
  "/:messUsername",
  requireAuth,
  requireMessMembership,
  asyncHandler(async (req, res) => {
    const mess = await prisma.mess.findUniqueOrThrow({
      where: { id: req.mess!.id },
      include: { settings: true },
    });
    res.json({ mess, myRole: req.membership!.role, permissions: publicPermissions(req.membership!.role, req.settings) });
  })
);

/** PATCH /mess/:messUsername/settings - ADMIN only, server-enforced feature toggles. */
router.patch(
  "/:messUsername/settings",
  requireAuth,
  requireMessMembership,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const input = updateMessSettingsSchema.parse(req.body);
    const settings = await prisma.messSettings.update({
      where: { messId: req.mess!.id },
      data: input,
    });
    await audit({
      messId: req.mess!.id,
      userId: req.user!.id,
      action: "UPDATE_SETTINGS",
      entityType: "MessSettings",
      metadata: input,
    });
    res.json({ settings });
  })
);

/** GET /mess/:messUsername/members - directory, ADMIN sees all, others see permitted fields. */
router.get(
  "/:messUsername/members",
  requireAuth,
  requireMessMembership,
  asyncHandler(async (req, res) => {
    const memberships = await prisma.messMembership.findMany({
      where: { messId: req.mess!.id, status: "ACTIVE" },
      include: { user: { select: { id: true, name: true, image: true, phone: true, email: true } } },
      orderBy: { joinedAt: "asc" },
    });
    res.json({ members: memberships });
  })
);

/** PATCH /mess/:messUsername/members/:userId/role - ADMIN only. */
router.patch(
  "/:messUsername/members/:userId/role",
  requireAuth,
  requireMessMembership,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const role = req.body.role;
    if (!["ADMIN", "MANAGER", "MEMBER"].includes(role)) throw Errors.validation("Invalid role");

    const membership = await prisma.messMembership.update({
      where: { messId_userId: { messId: req.mess!.id, userId: req.params.userId } },
      data: { role },
    });

    await audit({
      messId: req.mess!.id,
      userId: req.user!.id,
      action: "CHANGE_ROLE",
      entityType: "MessMembership",
      entityId: membership.id,
      metadata: { newRole: role, targetUserId: req.params.userId },
    });

    res.json({ membership });
  })
);

/** GET /mess/:messUsername/invitations - ADMIN lists sent invitations. */
router.get(
  "/:messUsername/invitations",
  requireAuth,
  requireMessMembership,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const invitations = await prisma.messInvitation.findMany({
      where: { messId: req.mess!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ invitations });
  })
);

/** POST /mess/:messUsername/invitations - ADMIN emails a Gmail invitation link. */
router.post(
  "/:messUsername/invitations",
  requireAuth,
  requireMessMembership,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const input = createInvitationSchema.parse(req.body);
    const email = input.email.trim().toLowerCase();
    const expiresInDays = input.expiresInDays ?? 7;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const membership = await prisma.messMembership.findUnique({
        where: { messId_userId: { messId: req.mess!.id, userId: existingUser.id } },
      });
      if (membership?.status === "ACTIVE") {
        throw Errors.conflict("That person is already a member of this Mess");
      }
    }

    let invitation = await prisma.messInvitation.findFirst({
      where: { messId: req.mess!.id, email, status: "ACTIVE", expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    if (!invitation) {
      invitation = await prisma.messInvitation.create({
        data: {
          messId: req.mess!.id,
          email,
          token: nanoid(24),
          expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
          createdById: req.user!.id,
        },
      });
    }

    const inviter = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      select: { name: true },
    });

    await sendMessInvitationEmail({
      to: email,
      inviterName: inviter.name,
      messName: req.mess!.name,
      token: invitation.token,
      expiresInDays,
    });

    await audit({
      messId: req.mess!.id,
      userId: req.user!.id,
      action: "SEND_INVITATION",
      entityType: "MessInvitation",
      entityId: invitation.id,
      metadata: { email },
    });

    res.status(201).json({ invitation });
  })
);

/** POST /mess/:messUsername/join-code/regenerate - ADMIN only. */
router.post(
  "/:messUsername/join-code/regenerate",
  requireAuth,
  requireMessMembership,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const mess = await prisma.mess.update({
      where: { id: req.mess!.id },
      data: { joinCode: nanoid(8) },
    });
    res.json({ joinCode: mess.joinCode });
  })
);

export default router;

import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireMessMembership, requireRole } from "../middleware/tenant";

const router = Router({ mergeParams: true });
router.use(requireAuth, requireMessMembership, requireRole("ADMIN"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const backups = await prisma.backup.findMany({ where: { messId: req.mess!.id }, orderBy: { createdAt: "desc" } });
    res.json({ backups });
  })
);

/**
 * POST /mess/:messUsername/backups - stub: registers a backup job. A full implementation
 * would enqueue an export to S3/Cloudinary and never write OAuth/DB/cron secrets into it.
 */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const backup = await prisma.backup.create({
      data: {
        messId: req.mess!.id,
        type: req.body?.type ?? "FULL_EXPORT",
        status: "PENDING",
        createdById: req.user!.id,
      },
    });
    res.status(201).json({ backup, note: "Stub: wire this up to your object storage export job." });
  })
);

export default router;

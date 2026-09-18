import { z } from "zod";

export const createExitRequestSchema = z.object({
  exitDate: z.string().date(),
  reason: z.string().max(500).optional(),
});

export const decideExitRequestSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

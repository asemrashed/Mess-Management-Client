import { z } from "zod";

export const createPaymentSchema = z.object({
  userId: z.string(),
  amount: z.number().positive(),
  type: z.enum(["MEAL", "RENT", "UTILITY", "GENERAL", "ADVANCE"]),
  paymentDate: z.string().date().optional(),
  reference: z.string().max(100).optional(),
  note: z.string().max(300).optional(),
});

export const createAdvanceSchema = z.object({
  userId: z.string(),
  type: z.enum(["DEPOSIT", "USE", "ADJUSTMENT", "REFUND"]),
  amount: z.number().positive(),
  reference: z.string().max(100).optional(),
  note: z.string().max(300).optional(),
});

export const updatePaymentSchema = createPaymentSchema.partial();
export const updateAdvanceSchema = createAdvanceSchema.partial();

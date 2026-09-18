import { z } from "zod";

export const submitMealSchema = z.object({
  date: z.string().date(), // "YYYY-MM-DD"
  breakfast: z.number().int().min(0).max(20).default(0),
  lunch: z.number().int().min(0).max(20).default(0),
  dinner: z.number().int().min(0).max(20).default(0),
  userId: z.string().optional(),
});

export const overrideMealSchema = z.object({
  breakfast: z.number().int().min(0).max(20).optional(),
  lunch: z.number().int().min(0).max(20).optional(),
  dinner: z.number().int().min(0).max(20).optional(),
  reason: z.string().min(1).max(300).default("Corrected by manager/admin"),
});

export const guestMealSchema = z.object({
  date: z.string().date(),
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER"]),
  quantity: z.number().int().min(1).max(20),
  guestName: z.string().max(100).optional(),
});

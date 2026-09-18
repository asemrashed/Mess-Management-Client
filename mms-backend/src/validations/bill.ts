import { z } from "zod";

export const createBillSchema = z.object({
  title: z.string().min(1).max(150),
  category: z.string().min(1).max(50),
  amount: z.number().positive(),
  billingPeriod: z.enum(["MONTHLY", "WEEKLY", "ONE_TIME", "CUSTOM"]).default("MONTHLY"),
  dueDate: z.string().date().optional(),
  distributionMethod: z.enum(["EQUAL", "CUSTOM"]).default("EQUAL"),
  customAssignments: z.array(z.object({ userId: z.string(), amount: z.number().nonnegative() })).optional(),
});

export const updateBillSchema = createBillSchema.partial();

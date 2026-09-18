import { z } from "zod";

export const createRuleSchema = z.object({
  category: z.string().min(1).max(50),
  title: z.string().min(1).max(150),
  description: z.string().max(1000).optional(),
});

export const updateRuleSchema = createRuleSchema.partial();

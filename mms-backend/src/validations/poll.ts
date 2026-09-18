import { z } from "zod";

export const createPollSchema = z.object({
  question: z.string().min(1).max(300),
  options: z.array(z.string().min(1).max(120)).min(2).max(10),
  choiceType: z.enum(["SINGLE", "MULTIPLE"]).default("SINGLE"),
  anonymous: z.boolean().default(false),
  endAt: z.string().datetime().optional(),
});

export const voteSchema = z.object({
  optionIds: z.array(z.string()).min(1),
});

export const updatePollSchema = z.object({
  question: z.string().min(1).max(300).optional(),
  endAt: z.string().datetime().nullable().optional(),
});

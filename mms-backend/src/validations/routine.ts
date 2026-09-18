import { z } from "zod";

export const createRoutineSchema = z.object({
  title: z.string().min(1).max(150),
  recurrenceRule: z.string().min(1).max(50),
  rotateMembers: z.boolean().default(true),
  assignments: z
    .array(z.object({ userId: z.string(), periodLabel: z.string(), dueDate: z.string().date() }))
    .min(1),
});

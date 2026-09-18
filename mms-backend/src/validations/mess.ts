import { z } from "zod";

export const createMessSchema = z.object({
  name: z.string().min(2).max(100),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only"),
  description: z.string().max(500).optional(),
  address: z.string().max(300).optional(),
  contactNumber: z.string().max(30).optional(),
});

export const joinByCodeSchema = z.object({
  username: z.string().min(1),
  joinCode: z.string().min(1),
});

export const createInvitationSchema = z.object({
  email: z.string().email().max(200),
  expiresInDays: z.number().int().min(1).max(30).optional(),
});

export const updateMessSettingsSchema = z
  .object({
    mealManagementEnabled: z.boolean(),
    groceryEnabled: z.boolean(),
    rentEnabled: z.boolean(),
    utilityEnabled: z.boolean(),
    pollsEnabled: z.boolean(),
    notesEnabled: z.boolean(),
    routinesEnabled: z.boolean(),
    exitManagementEnabled: z.boolean(),
    notificationsEnabled: z.boolean(),
    emailNotificationsEnabled: z.boolean(),
    breakfastEnabled: z.boolean(),
    lunchEnabled: z.boolean(),
    dinnerEnabled: z.boolean(),
    mealDeadlineHour: z.number().int().min(0).max(23),
    guestMealsEnabled: z.boolean(),
    paymentGraceDays: z.number().int().min(0).max(90),
    blockMealsWhenOverdue: z.boolean(),
    monthlyRent: z.number().nonnegative().optional(),
    rentAdvanceMonths: z.number().int().min(0).max(12),
    exitNoticeDays: z.number().int().min(0).max(180),
    managerCanMeals: z.boolean(),
    managerCanGrocery: z.boolean(),
    managerCanMealFinance: z.boolean(),
    managerCanRent: z.boolean(),
    managerCanWifi: z.boolean(),
    managerCanUtilities: z.boolean(),
    managerCanOtherBills: z.boolean(),
  })
  .partial();

import { z } from "zod";

export const groceryUnits = ["kg", "lt", "piece"] as const;

export const groceryItemSchema = z.object({
  product: z.string().min(1).max(150),
  quantity: z.number().positive(),
  unit: z.enum(groceryUnits),
  price: z.number().positive(),
});

export const createGrocerySchema = z.object({
  items: z.array(groceryItemSchema).min(1).max(50),
  purchaseDate: z.string().date(),
  categoryId: z.string().optional(),
  paymentSourceUserId: z.string().optional(),
  note: z.string().max(500).optional(),
});

export const decideGrocerySchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export const updateGrocerySchema = createGrocerySchema.partial().extend({
  items: z.array(groceryItemSchema).min(1).max(50).optional(),
});

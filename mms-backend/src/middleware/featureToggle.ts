import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { Errors } from "../lib/errors";

type ToggleKey =
  | "mealManagementEnabled"
  | "groceryEnabled"
  | "rentEnabled"
  | "utilityEnabled"
  | "pollsEnabled"
  | "notesEnabled"
  | "routinesEnabled"
  | "exitManagementEnabled"
  | "notificationsEnabled"
  | "emailNotificationsEnabled";

/**
 * Step 5 of the mutation security pipeline: Feature enabled?
 * Disabled modules are rejected server-side regardless of what the UI shows.
 */
export function requireFeature(key: ToggleKey) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.mess) return next(Errors.notAMember());
      const settings = await prisma.messSettings.findUnique({ where: { messId: req.mess.id } });
      if (!settings || !settings[key]) return next(Errors.featureDisabled(key));
      next();
    } catch (err) {
      next(err);
    }
  };
}

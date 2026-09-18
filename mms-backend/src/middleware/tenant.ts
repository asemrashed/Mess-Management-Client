import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { Errors } from "../lib/errors";
import { MembershipRole, MessMembership, MessSettings } from "@prisma/client";
import { hasScope, ManagerScope } from "../permissions";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      mess?: { id: string; username: string; name: string };
      membership?: MessMembership;
      settings?: MessSettings | null;
    }
  }
}

/**
 * Steps 2-3 of the mutation security pipeline: Member of Mess? Resource belongs to Mess?
 * Resolves :messUsername from the route, loads the Mess, and verifies the authenticated
 * user has an ACTIVE membership in it. Cross-Mess access is impossible because every
 * subsequent query in a route handler is scoped by req.mess.id, never a bare messId
 * taken from the request body.
 */
export async function requireMessMembership(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user) return next(Errors.notAuthenticated());

    const messUsername = req.params.messUsername;
    if (!messUsername) return next(Errors.notFound("Mess"));

    const mess = await prisma.mess.findUnique({
      where: { username: messUsername },
      include: { settings: true },
    });
    if (!mess) return next(Errors.notFound("Mess"));

    const membership = await prisma.messMembership.findUnique({
      where: { messId_userId: { messId: mess.id, userId: req.user.id } },
    });

    if (!membership || membership.status !== "ACTIVE") {
      return next(Errors.notAMember());
    }

    req.mess = { id: mess.id, username: mess.username, name: mess.name };
    req.membership = membership;
    req.settings = mess.settings;
    next();
  } catch (err) {
    next(err);
  }
}

/** Step 4 of the pipeline: Permission? Restricts a route to one or more membership roles. */
export function requireRole(...roles: MembershipRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.membership) return next(Errors.notAMember());
    if (!roles.includes(req.membership.role)) return next(Errors.insufficientPermission());
    next();
  };
}

/** ADMIN always passes; MANAGER passes only when the admin enabled that scope. */
export function requireScope(scope: ManagerScope) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.membership) return next(Errors.notAMember());
    if (hasScope(req.membership.role, req.settings, scope)) return next();
    return next(Errors.insufficientPermission());
  };
}

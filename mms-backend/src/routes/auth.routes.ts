import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { randomInt } from "crypto";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { Errors } from "../lib/errors";
import { requireAuth } from "../middleware/auth";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from "../validations/auth";
import { sendPasswordResetEmail, sendWelcomeEmail, sendRegistrationOtpEmail } from "../lib/mailer";

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const PASSWORD_SALT_ROUNDS = 10;
const OTP_TTL_MS = 15 * 60 * 1000; // 15 minutes — one-time code after register
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

function issueTokens(user: { id: string; email: string }) {
  return {
    accessToken: signAccessToken({ sub: user.id, email: user.email }),
    refreshToken: signRefreshToken({ sub: user.id, email: user.email }),
  };
}

async function issueRegistrationOtp(user: { id: string; email: string; name: string }) {
  await prisma.emailVerificationToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  const code = String(randomInt(100000, 1000000));
  await prisma.emailVerificationToken.create({
    data: { userId: user.id, token: code, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
  });
  await sendRegistrationOtpEmail(user.email, user.name, code);
}

// ============================================================
// GOOGLE OAUTH
// ============================================================

const googleLoginSchema = z.object({ idToken: z.string().min(10) });

/**
 * POST /auth/google — frontend runs Google Sign-In and forwards the resulting ID token.
 * We verify it against Google, upsert the User (Google accounts are auto-verified since
 * Google already confirmed the email), and issue our own JWTs.
 */
router.post(
  "/google",
  asyncHandler(async (req, res) => {
    const { idToken } = googleLoginSchema.parse(req.body);

    const ticket = await googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.email) throw Errors.validation("Invalid Google token");

    const existing = await prisma.user.findUnique({ where: { email: payload.email } });

    const user = await prisma.user.upsert({
      where: { email: payload.email },
      create: {
        email: payload.email,
        name: payload.name ?? payload.email.split("@")[0],
        image: payload.picture,
        googleId: payload.sub,
        emailVerified: new Date(),
      },
      update: {
        name: payload.name ?? undefined,
        image: payload.picture ?? undefined,
        googleId: payload.sub,
      },
    });

    // Ensure emailVerified is set even for pre-existing manual accounts that later use Google.
    if (!existing?.emailVerified) {
      await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
    }
    if (!existing) {
      await sendWelcomeEmail(user.email, user.name);
    }

    const tokens = issueTokens(user);
    res.json({ user, ...tokens });
  })
);

// ============================================================
// MANUAL REGISTER / LOGIN
// ============================================================

/** POST /auth/register — email + password account creation. Sends a one-time 6-digit code. */
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      // Don't reveal which accounts exist via account type; a generic conflict is enough.
      throw Errors.conflict("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash },
    });

    await issueRegistrationOtp(user);

    // Do not issue a session yet — the user confirms with the email code first.
    res.status(201).json({ ok: true, email: user.email, codeSent: true });
  })
);

/** POST /auth/login — email + password sign-in. Existing users are not asked to re-verify. */
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !user.passwordHash) {
      // Same error whether the email doesn't exist or the account is Google-only,
      // so we don't leak account existence/type.
      throw Errors.validation("Invalid email or password");
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw Errors.validation("Invalid email or password");

    // Grandfather existing accounts that never completed email verification so they
    // are not prompted again on every login.
    if (!user.emailVerified) {
      await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
    }

    const tokens = issueTokens(user);
    res.json({ user, ...tokens });
  })
);

/** POST /auth/verify-email — confirm the 6-digit code (or a legacy magic-link token). */
router.post(
  "/verify-email",
  asyncHandler(async (req, res) => {
    const input = verifyEmailSchema.parse(req.body);

    const record = input.token
      ? await prisma.emailVerificationToken.findUnique({ where: { token: input.token } })
      : await prisma.emailVerificationToken.findFirst({
          where: {
            token: input.code!,
            usedAt: null,
            expiresAt: { gt: new Date() },
            user: { email: { equals: input.email!, mode: "insensitive" } },
          },
          orderBy: { createdAt: "desc" },
        });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw Errors.validation("This verification code is invalid or has expired");
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { emailVerified: new Date() } }),
      prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);

    res.json({ ok: true });
  })
);

/** POST /auth/resend-verification — send a fresh 6-digit code to an unverified email. */
router.post(
  "/resend-verification",
  asyncHandler(async (req, res) => {
    const { email } = resendVerificationSchema.parse(req.body);
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    if (user && !user.emailVerified) {
      await issueRegistrationOtp(user);
    }

    res.json({ ok: true });
  })
);

// ============================================================
// PASSWORD RESET ("forgot to everything" flow)
// ============================================================

/** POST /auth/forgot-password — always returns 200, whether or not the email exists. */
router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const input = forgotPasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    // Only send a real reset email if the account exists and has a password (i.e. isn't
    // Google-only) — but always respond identically either way to avoid account enumeration.
    if (user?.passwordHash) {
      const token = nanoid(32);
      await prisma.passwordResetToken.create({
        data: { userId: user.id, token, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
      });
      await sendPasswordResetEmail(user.email, user.name, token);
    }

    res.json({ ok: true, message: "If an account exists for that email, a reset link has been sent." });
  })
);

/** POST /auth/reset-password — consumes the token from the forgot-password email. */
router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const input = resetPasswordSchema.parse(req.body);
    const record = await prisma.passwordResetToken.findUnique({ where: { token: input.token } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw Errors.validation("This reset link is invalid or has expired");
    }

    const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      // Invalidate any other outstanding reset tokens for this user.
      prisma.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null, id: { not: record.id } },
        data: { usedAt: new Date() },
      }),
    ]);

    res.json({ ok: true });
  })
);

/** POST /auth/change-password — for a signed-in user who knows their current password. */
router.post(
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = changePasswordSchema.parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    if (!user.passwordHash) {
      throw Errors.validation("This account signs in with Google and has no password to change");
    }

    const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!valid) throw Errors.validation("Current password is incorrect");

    const passwordHash = await bcrypt.hash(input.newPassword, PASSWORD_SALT_ROUNDS);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    res.json({ ok: true });
  })
);

// ============================================================
// SESSION
// ============================================================

const refreshSchema = z.object({ refreshToken: z.string() });

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw Errors.notAuthenticated();
    }
    const accessToken = signAccessToken({ sub: payload.sub, email: payload.email });
    res.json({ accessToken });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    const memberships = await prisma.messMembership.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      include: { mess: { select: { id: true, name: true, username: true } } },
    });
    res.json({ user, memberships });
  })
);

export default router;

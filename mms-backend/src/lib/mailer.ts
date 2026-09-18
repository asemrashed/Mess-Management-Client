import nodemailer, { Transporter } from "nodemailer";

/**
 * Central mailer. Every outgoing email in the app (verification, password reset,
 * welcome, payment/meal-deadline reminders, manager assignment, exit decisions) goes
 * through `sendMail()` here. Email failure must never roll back a core business
 * transaction (section 22 of the master plan) — callers should fire-and-log, not await
 * inside a Prisma transaction. See notifyByEmail() for that pattern.
 */

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    // eslint-disable-next-line no-console
    console.warn("SMTP is not configured (SMTP_HOST/PORT/USER/PASS missing) — emails will be logged, not sent.");
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true", // true for port 465, false for 587/25 (STARTTLS)
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return transporter;
}

export async function sendMail(params: { to: string; subject: string; html: string; text?: string }) {
  const t = getTransporter();
  const from = process.env.SMTP_FROM || "MMS <no-reply@example.com>";

  if (!t) {
    // Dev fallback: log instead of failing outright, so local dev without SMTP still works.
    // eslint-disable-next-line no-console
    console.log(`[mailer:dev] To: ${params.to} | Subject: ${params.subject}\n${params.text ?? params.html}`);
    return;
  }

  try {
    await t.sendMail({ from, to: params.to, subject: params.subject, html: params.html, text: params.text });
  } catch (err) {
    // Never let email failure break the calling business transaction.
    // eslint-disable-next-line no-console
    console.error("Failed to send email:", err);
  }
}

const appUrl = () => process.env.FRONTEND_URL?.split(",")[0] ?? "http://localhost:3000";

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const link = `${appUrl()}/verify-email/${token}`;
  await sendMail({
    to,
    subject: "Verify your MMS account",
    html: `<p>Hi ${name},</p><p>Confirm your email to activate your MMS account:</p><p><a href="${link}">${link}</a></p><p>This link expires in 24 hours.</p>`,
    text: `Hi ${name}, verify your MMS account: ${link} (expires in 24 hours)`,
  });
}

export async function sendRegistrationOtpEmail(to: string, name: string, code: string) {
  await sendMail({
    to,
    subject: "Your MMS verification code",
    html: `<p>Hi ${name},</p><p>Your MMS verification code is:</p><p style="font-size:28px;letter-spacing:6px;font-weight:700">${code}</p><p>This code expires in 15 minutes. You only need it once, after registering.</p>`,
    text: `Hi ${name}, your MMS verification code is ${code}. It expires in 15 minutes.`,
  });
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const link = `${appUrl()}/reset-password/${token}`;
  await sendMail({
    to,
    subject: "Reset your MMS password",
    html: `<p>Hi ${name},</p><p>Reset your password using the link below. If you didn't request this, you can ignore this email.</p><p><a href="${link}">${link}</a></p><p>This link expires in 1 hour.</p>`,
    text: `Hi ${name}, reset your MMS password: ${link} (expires in 1 hour)`,
  });
}

export async function sendWelcomeEmail(to: string, name: string) {
  await sendMail({
    to,
    subject: "Welcome to MMS",
    html: `<p>Hi ${name}, your account is ready. Create or join a Mess to get started.</p>`,
    text: `Hi ${name}, your account is ready. Create or join a Mess to get started.`,
  });
}

export async function sendMessInvitationEmail(params: {
  to: string;
  inviterName: string;
  messName: string;
  token: string;
  expiresInDays: number;
}) {
  const link = `${appUrl()}/join/invite/${params.token}`;
  await sendMail({
    to: params.to,
    subject: `You're invited to join ${params.messName} on MMS`,
    html: `<p>Hi,</p>
<p><strong>${params.inviterName}</strong> invited you to join <strong>${params.messName}</strong> on MMS.</p>
<p>Open this link while signed in with this email address to join:</p>
<p><a href="${link}">${link}</a></p>
<p>This invitation expires in ${params.expiresInDays} day${params.expiresInDays === 1 ? "" : "s"}. If you don't have an account yet, create one with this same email first.</p>`,
    text: `${params.inviterName} invited you to join ${params.messName} on MMS. Join here (sign in with this email): ${link}`,
  });
}

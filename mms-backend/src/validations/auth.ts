import { z } from "zod";

const passwordRule = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72)
  .regex(/[a-z]/, "Must include a lowercase letter")
  .regex(/[A-Z]/, "Must include an uppercase letter")
  .regex(/[0-9]/, "Must include a number");

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: passwordRule,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: passwordRule,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordRule,
});

export const verifyEmailSchema = z
  .object({
    token: z.string().min(6).optional(),
    email: z.string().email().optional(),
    code: z.string().regex(/^\d{6}$/).optional(),
  })
  .refine((v) => Boolean(v.token) || (v.email && v.code), {
    message: "Provide a verification code",
  });

export const resendVerificationSchema = z.object({
  email: z.string().email(),
});

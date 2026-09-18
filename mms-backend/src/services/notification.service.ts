import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { sendMail } from "../lib/mailer";

export async function notify(params: {
  messId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  referenceType?: string;
  referenceId?: string;
}) {
  const settings = await prisma.messSettings.findUnique({ where: { messId: params.messId } });
  if (settings && !settings.notificationsEnabled) return null;

  const notification = await prisma.notification.create({ data: params });

  // Email is a best-effort extra channel on top of the in-app notification — never blocks it.
  if (settings?.emailNotificationsEnabled) {
    const user = await prisma.user.findUnique({ where: { id: params.userId } });
    if (user?.email) {
      void sendMail({
        to: user.email,
        subject: params.title,
        html: `<p>${params.message}</p>`,
        text: params.message,
      });
    }
  }

  return notification;
}

export async function audit(params: {
  messId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.auditLog.create({ data: params });
}

import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.routes";
import messRoutes from "./routes/mess.routes";
import mealRoutes from "./routes/meal.routes";
import groceryRoutes from "./routes/grocery.routes";
import noteRoutes from "./routes/note.routes";
import pollRoutes from "./routes/poll.routes";
import billRoutes from "./routes/bill.routes";
import paymentRoutes from "./routes/payment.routes";
import advanceRoutes from "./routes/advance.routes";
import periodRoutes from "./routes/period.routes";
import statementRoutes from "./routes/statement.routes";
import routineRoutes from "./routes/routine.routes";
import exitRoutes from "./routes/exit.routes";
import notificationRoutes from "./routes/notification.routes";
import ruleRoutes from "./routes/rule.routes";
import reportRoutes from "./routes/report.routes";
import auditRoutes from "./routes/audit.routes";
import backupRoutes from "./routes/backup.routes";
import managerRoutes from "./routes/manager.routes";
import cronRoutes from "./routes/cron.routes";

import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL?.split(",") ?? "*",
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/", (_req, res) =>
  res.json({ name: "MMS API", ok: true, health: "/health" })
);
app.get("/health", (_req, res) => res.json({ ok: true }));

// Rate-limit Mess join attempts (username+code and invitation flows). Section 7/48.
const joinLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use("/mess/join", joinLimiter);

// Rate-limit auth endpoints against brute force / credential stuffing / email-bombing.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15 });
app.use(
  ["/auth/login", "/auth/register", "/auth/forgot-password", "/auth/resend-verification", "/auth/verify-email"],
  authLimiter
);

app.use("/auth", authRoutes);
app.use("/cron", cronRoutes);
app.use("/mess", messRoutes);

// Sub-resources scoped under /mess/:messUsername/*. Each router independently re-verifies
// membership via requireMessMembership, so nothing here trusts the parent router's checks alone.
app.use("/mess/:messUsername/meals", mealRoutes);
app.use("/mess/:messUsername/groceries", groceryRoutes);
app.use("/mess/:messUsername/notes", noteRoutes);
app.use("/mess/:messUsername/polls", pollRoutes);
app.use("/mess/:messUsername/bills", billRoutes);
app.use("/mess/:messUsername/payments", paymentRoutes);
app.use("/mess/:messUsername/advances", advanceRoutes);
app.use("/mess/:messUsername/periods", periodRoutes);
app.use("/mess/:messUsername/statements", statementRoutes);
app.use("/mess/:messUsername/routines", routineRoutes);
app.use("/mess/:messUsername/exit", exitRoutes);
app.use("/mess/:messUsername/notifications", notificationRoutes);
app.use("/mess/:messUsername/rules", ruleRoutes);
app.use("/mess/:messUsername/reports", reportRoutes);
app.use("/mess/:messUsername/audit-logs", auditRoutes);
app.use("/mess/:messUsername/backups", backupRoutes);
app.use("/mess/:messUsername/managers", managerRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

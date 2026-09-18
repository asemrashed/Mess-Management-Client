export type ErrorCode =
  | "NOT_AUTHENTICATED"
  | "NOT_A_MEMBER"
  | "INSUFFICIENT_PERMISSION"
  | "FEATURE_DISABLED"
  | "MEAL_DEADLINE_PASSED"
  | "PAYMENT_REQUIRED"
  | "POLL_CLOSED"
  | "ALREADY_VOTED"
  | "INVALID_INVITATION"
  | "INVALID_JOIN_CODE"
  | "GROCERY_ALREADY_APPROVED"
  | "ACCOUNTING_PERIOD_CLOSED"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  code: ErrorCode;
  status: number;
  details?: unknown;

  constructor(code: ErrorCode, message: string, status = 400, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const Errors = {
  notAuthenticated: () => new AppError("NOT_AUTHENTICATED", "Authentication required", 401),
  notAMember: () => new AppError("NOT_A_MEMBER", "You are not a member of this Mess", 403),
  insufficientPermission: () =>
    new AppError("INSUFFICIENT_PERMISSION", "You do not have permission to perform this action", 403),
  featureDisabled: (feature: string) =>
    new AppError("FEATURE_DISABLED", `The '${feature}' feature is disabled for this Mess`, 403),
  mealDeadlinePassed: () => new AppError("MEAL_DEADLINE_PASSED", "The meal submission deadline has passed", 400),
  paymentRequired: () => new AppError("PAYMENT_REQUIRED", "Previous dues must be paid before continuing", 402),
  pollClosed: () => new AppError("POLL_CLOSED", "This poll is closed", 400),
  alreadyVoted: () => new AppError("ALREADY_VOTED", "You have already voted", 409),
  invalidInvitation: () => new AppError("INVALID_INVITATION", "Invitation link is invalid or expired", 400),
  invalidJoinCode: () => new AppError("INVALID_JOIN_CODE", "Join code is invalid", 400),
  groceryAlreadyApproved: () =>
    new AppError("GROCERY_ALREADY_APPROVED", "This grocery purchase has already been approved", 409),
  accountingPeriodClosed: () =>
    new AppError("ACCOUNTING_PERIOD_CLOSED", "This accounting period is closed", 400),
  notFound: (entity = "Resource") => new AppError("NOT_FOUND", `${entity} not found`, 404),
  validation: (details?: unknown) => new AppError("VALIDATION_ERROR", "Invalid input", 422, details),
  conflict: (message = "Conflict") => new AppError("CONFLICT", message, 409),
  internal: (message = "Internal server error") => new AppError("INTERNAL_ERROR", message, 500),
};

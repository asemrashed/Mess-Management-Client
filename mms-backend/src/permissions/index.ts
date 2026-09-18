import { MembershipRole, MessSettings, PaymentType } from "@prisma/client";

export type ManagerScope =
  | "meals"
  | "grocery"
  | "mealFinance"
  | "rent"
  | "wifi"
  | "utilities"
  | "otherBills";

const SCOPE_FLAG: Record<ManagerScope, keyof MessSettings> = {
  meals: "managerCanMeals",
  grocery: "managerCanGrocery",
  mealFinance: "managerCanMealFinance",
  rent: "managerCanRent",
  wifi: "managerCanWifi",
  utilities: "managerCanUtilities",
  otherBills: "managerCanOtherBills",
};

export function hasScope(
  role: MembershipRole,
  settings: MessSettings | null | undefined,
  scope: ManagerScope
): boolean {
  if (role === "ADMIN") return true;
  if (role !== "MANAGER" || !settings) return false;
  return Boolean(settings[SCOPE_FLAG[scope]]);
}

export function isStaff(role: MembershipRole): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

export function billCategoryScope(category: string): ManagerScope {
  const c = category.trim().toLowerCase();
  if (c === "rent") return "rent";
  if (c === "wifi") return "wifi";
  if (c === "electricity" || c === "water" || c === "gas") return "utilities";
  return "otherBills";
}

export function paymentTypeScopes(type: PaymentType): ManagerScope[] {
  switch (type) {
    case "MEAL":
    case "ADVANCE":
      return ["mealFinance"];
    case "RENT":
      return ["rent"];
    case "UTILITY":
      return ["utilities", "wifi"];
    case "GENERAL":
      return ["otherBills"];
    default:
      return [];
  }
}

export function canManagePayment(
  role: MembershipRole,
  settings: MessSettings | null | undefined,
  type: PaymentType
): boolean {
  return paymentTypeScopes(type).some((scope) => hasScope(role, settings, scope));
}

export function allowedPaymentTypes(
  role: MembershipRole,
  settings: MessSettings | null | undefined
): PaymentType[] {
  const all: PaymentType[] = ["MEAL", "RENT", "UTILITY", "GENERAL", "ADVANCE"];
  return all.filter((type) => canManagePayment(role, settings, type));
}

export function publicPermissions(role: MembershipRole, settings: MessSettings | null | undefined) {
  return {
    meals: hasScope(role, settings, "meals"),
    grocery: hasScope(role, settings, "grocery"),
    mealFinance: hasScope(role, settings, "mealFinance"),
    rent: hasScope(role, settings, "rent"),
    wifi: hasScope(role, settings, "wifi"),
    utilities: hasScope(role, settings, "utilities"),
    otherBills: hasScope(role, settings, "otherBills"),
    isStaff: isStaff(role),
  };
}

export function assert(condition: boolean, err: Error): void {
  if (!condition) throw err;
}

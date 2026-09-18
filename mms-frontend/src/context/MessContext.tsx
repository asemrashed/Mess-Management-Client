"use client";

import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type ManagerScope =
  | "meals"
  | "grocery"
  | "mealFinance"
  | "rent"
  | "wifi"
  | "utilities"
  | "otherBills";

export interface MessSettings {
  mealManagementEnabled: boolean;
  groceryEnabled: boolean;
  rentEnabled: boolean;
  utilityEnabled: boolean;
  pollsEnabled: boolean;
  notesEnabled: boolean;
  routinesEnabled: boolean;
  exitManagementEnabled: boolean;
  notificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  breakfastEnabled: boolean;
  lunchEnabled: boolean;
  dinnerEnabled: boolean;
  mealDeadlineHour: number;
  guestMealsEnabled: boolean;
  paymentGraceDays: number;
  blockMealsWhenOverdue: boolean;
  monthlyRent: string | null;
  rentAdvanceMonths: number;
  exitNoticeDays: number;
  managerCanMeals: boolean;
  managerCanGrocery: boolean;
  managerCanMealFinance: boolean;
  managerCanRent: boolean;
  managerCanWifi: boolean;
  managerCanUtilities: boolean;
  managerCanOtherBills: boolean;
}

export interface MessPermissions {
  meals: boolean;
  grocery: boolean;
  mealFinance: boolean;
  rent: boolean;
  wifi: boolean;
  utilities: boolean;
  otherBills: boolean;
  isStaff: boolean;
}

export interface MessInfo {
  id: string;
  name: string;
  username: string;
  description?: string | null;
  address?: string | null;
  contactNumber?: string | null;
  joinCode: string;
  timezone: string;
  settings: MessSettings;
}

interface MessContextValue {
  mess?: MessInfo;
  myRole?: "ADMIN" | "MANAGER" | "MEMBER";
  permissions?: MessPermissions;
  can: (scope: ManagerScope) => boolean;
  isLoading: boolean;
  error?: Error | null;
}

const defaultPermissions: MessPermissions = {
  meals: false,
  grocery: false,
  mealFinance: false,
  rent: false,
  wifi: false,
  utilities: false,
  otherBills: false,
  isStaff: false,
};

function computePermissions(
  role?: "ADMIN" | "MANAGER" | "MEMBER",
  settings?: MessSettings
): MessPermissions {
  if (role === "ADMIN") {
    return {
      meals: true,
      grocery: true,
      mealFinance: true,
      rent: true,
      wifi: true,
      utilities: true,
      otherBills: true,
      isStaff: true,
    };
  }
  if (role !== "MANAGER") return defaultPermissions;
  return {
    meals: settings?.managerCanMeals !== false,
    grocery: settings?.managerCanGrocery !== false,
    mealFinance: settings?.managerCanMealFinance !== false,
    rent: !!settings?.managerCanRent,
    wifi: !!settings?.managerCanWifi,
    utilities: !!settings?.managerCanUtilities,
    otherBills: !!settings?.managerCanOtherBills,
    isStaff: true,
  };
}

const MessContext = createContext<MessContextValue>({
  isLoading: true,
  can: () => false,
});

export function billCategoryScope(category: string): ManagerScope {
  const c = category.trim().toLowerCase();
  if (c === "rent") return "rent";
  if (c === "wifi") return "wifi";
  if (c === "electricity" || c === "water" || c === "gas") return "utilities";
  return "otherBills";
}

export function paymentTypeScope(type: string): ManagerScope | ManagerScope[] {
  switch (type) {
    case "MEAL":
    case "ADVANCE":
      return "mealFinance";
    case "RENT":
      return "rent";
    case "UTILITY":
      return ["utilities", "wifi"];
    case "GENERAL":
      return "otherBills";
    default:
      return "mealFinance";
  }
}

export function MessProvider({ messUsername, children }: { messUsername: string; children: React.ReactNode }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["mess", messUsername],
    queryFn: () =>
      api.get<{ mess: MessInfo; myRole: "ADMIN" | "MANAGER" | "MEMBER"; permissions: MessPermissions }>(
        `/mess/${messUsername}`
      ),
  });

  const permissions = data?.permissions ?? computePermissions(data?.myRole, data?.mess?.settings);
  const can = (scope: ManagerScope) => Boolean(permissions[scope]);

  return (
    <MessContext.Provider
      value={{
        mess: data?.mess,
        myRole: data?.myRole,
        permissions,
        can,
        isLoading,
        error: error as Error | null,
      }}
    >
      {children}
    </MessContext.Provider>
  );
}

export function useMess() {
  return useContext(MessContext);
}

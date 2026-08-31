"use client";

import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

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
  isLoading: boolean;
  error?: Error | null;
}

const MessContext = createContext<MessContextValue>({ isLoading: true });

export function MessProvider({ messUsername, children }: { messUsername: string; children: React.ReactNode }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["mess", messUsername],
    queryFn: () => api.get<{ mess: MessInfo; myRole: "ADMIN" | "MANAGER" | "MEMBER" }>(`/mess/${messUsername}`),
  });

  return (
    <MessContext.Provider value={{ mess: data?.mess, myRole: data?.myRole, isLoading, error: error as Error | null }}>
      {children}
    </MessContext.Provider>
  );
}

export function useMess() {
  return useContext(MessContext);
}

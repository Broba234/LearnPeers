"use client";
import { createContext, useContext } from "react";

export const TutorProfileModalContext = createContext<{
  openTutorProfileModal: (tutor: any) => void;
  openConnectNow: (tutor: any) => void;
} | undefined>(undefined);

export function useTutorProfileModal() {
  const ctx = useContext(TutorProfileModalContext);
  if (!ctx) throw new Error("useTutorProfileModal must be used within TutorProfileModalContext");
  return ctx;
}


"use client";

/**
 * @fileoverview Keeps public policy routes outside account-owned providers while
 * preserving the existing authenticated boundary for every application route.
 */

import { usePathname } from "next/navigation";
import { isPublicPolicyPath } from "@/lib/public-policies.mjs";
import { AuthGate, AuthProvider } from "./auth-provider";
import { GoogleCalendarProvider } from "./google-calendar-provider";
import { LogNoteDataProvider } from "./log-note-data-provider";

export function AppProviders({ children }) {
  const pathname = usePathname();
  if (isPublicPolicyPath(pathname)) {
    return <div data-public-provider-boundary="true">{children}</div>;
  }
  return (
    <AuthProvider>
      <AuthGate>
        <LogNoteDataProvider>
          <GoogleCalendarProvider>{children}</GoogleCalendarProvider>
        </LogNoteDataProvider>
      </AuthGate>
    </AuthProvider>
  );
}

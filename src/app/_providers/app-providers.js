"use client";

/**
 * @fileoverview Keeps public policy routes outside account-owned providers while
 * keeping local-first application data available before account authentication.
 */

import { usePathname } from "next/navigation";
import { isPublicPolicyPath } from "@/lib/public-policies.mjs";
import { AuthGate, AuthProvider } from "./auth-provider";
import { GoogleCalendarProvider } from "./google-calendar-provider";
import { LogNoteDataProvider } from "./log-note-data-provider";
import { AgentBridgeProvider } from "../settings/_components/agent-bridge/agent-bridge-provider";

export function AppProviders({ children }) {
  const pathname = usePathname();
  if (isPublicPolicyPath(pathname)) {
    return <div data-public-provider-boundary="true">{children}</div>;
  }
  return (
    <AuthProvider>
      <LogNoteDataProvider>
        <GoogleCalendarProvider>
          <AgentBridgeProvider>
            <AuthGate>{children}</AuthGate>
          </AgentBridgeProvider>
        </GoogleCalendarProvider>
      </LogNoteDataProvider>
    </AuthProvider>
  );
}

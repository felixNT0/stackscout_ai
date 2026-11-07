"use client";

import { AuthSessionProvider } from "@/components/auth-session-provider";
import { Toaster } from "@/components/ui/toaster";
import { ProgressProvider } from "@bprogress/next/app";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthSessionProvider>
      <ProgressProvider
        height="3px"
        color="hsl(var(--primary))"
        options={{ showSpinner: false }}
        shallowRouting
      >
        {children}
      </ProgressProvider>
      <Toaster />
    </AuthSessionProvider>
  );
}

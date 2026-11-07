"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="h-20 w-20 rounded-lg bg-destructive/10 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-muted-foreground mt-2">
            An unexpected error occurred. You can try again or go back to the
            dashboard.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground/60 mt-2 font-mono">
              Error ID: {error.digest}
            </p>
          )}
        </div>
        <div className="flex gap-4 justify-center">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

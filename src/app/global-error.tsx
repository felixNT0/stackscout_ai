"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="h-20 w-20 rounded-lg bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-muted-foreground mt-2">
              A critical error occurred. Please try again.
            </p>
          </div>
          <div className="flex gap-4 justify-center">
            <Button onClick={reset}>Try again</Button>
            <Button variant="outline" onClick={() => router.push("/")}>
              Go home
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}

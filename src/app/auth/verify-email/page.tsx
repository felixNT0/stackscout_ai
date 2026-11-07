"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Briefcase, CheckCircle, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function VerifyEmailContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || !email) {
      setStatus("error");
      setError("Invalid verification link");
      return;
    }

    async function verify() {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, email }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Verification failed");
        }

        setStatus("success");
        toast({ title: "Email verified!", description: "You can now sign in." });
        setTimeout(() => router.push("/auth/signin"), 2000);
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Verification failed");
      }
    }

    verify();
  }, [token, email, router, toast]);

  return (
    <div className="text-center space-y-4">
      {status === "loading" && (
        <>
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verifying your email...</p>
        </>
      )}
      {status === "success" && (
        <>
          <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
          <p className="font-medium">Email verified!</p>
          <p className="text-sm text-muted-foreground">Redirecting to sign in...</p>
        </>
      )}
      {status === "error" && (
        <>
          <XCircle className="h-12 w-12 mx-auto text-destructive" />
          <p className="font-medium">Verification failed</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Link href="/auth/signin">
            <Button variant="outline">Back to sign in</Button>
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-lg bg-linear-to-br from-primary to-secondary flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold">StackScout AI</span>
          </Link>
          <h1 className="text-2xl font-bold">Verify your email</h1>
        </div>

        <div className="bg-card border rounded-lg p-8">
          <Suspense fallback={<div className="h-32 animate-pulse rounded bg-muted" />}>
            <VerifyEmailContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

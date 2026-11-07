"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export function HeroCTA() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && session?.user;

  if (isAuthenticated) {
    return (
      <Link href="/dashboard">
        <Button size="lg" className="gap-2">
          Go to Dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    );
  }

  return (
    <Link href="/auth/signup">
      <Button size="lg" className="gap-2">
        Find My Next Job
        <ArrowRight className="h-4 w-4" />
      </Button>
    </Link>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LandingSearch() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");

  const isAuthenticated = status === "authenticated" && session?.user;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (location.trim()) params.set("location", location.trim());

    const searchUrl = `/dashboard/search${params.toString() ? `?${params}` : ""}`;

    if (isAuthenticated) {
      router.push(searchUrl);
    } else {
      router.push(`/auth/signup?next=${encodeURIComponent(searchUrl)}`);
    }
  }

  return (
    <form
      onSubmit={handleSearch}
      className="bg-card border rounded-lg p-4 max-w-3xl mx-auto mb-8"
    >
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Job title, keyword, or technology"
              className="pl-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Location"
              className="pl-10"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>
        <Button type="submit" className="w-full md:w-auto">
          Search Jobs
        </Button>
      </div>
    </form>
  );
}

"use client";

import { JobCard, JobCardSkeleton } from "@/components/jobs/job-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import type { Job } from "@/types";
import {
  AlertTriangle,
  Briefcase,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

interface ProviderInfo {
  name: string;
  count: number;
  error: string | null;
  mocked: boolean;
}

interface GeneratedQuery {
  query: string;
  rationale: string;
}

interface DiscoverResponse {
  jobs: Job[];
  total: number;
  queries: string[];
  generated_queries: GeneratedQuery[];
  providers: ProviderInfo[];
  used_mock: boolean;
}

export default function JobDiscoverPage() {
  const { toast } = useToast();
  const [customQueries, setCustomQueries] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiscoverResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const newest = useMemo(() => {
    if (!result) return [] as Job[];
    return [...result.jobs]
      .sort((a, b) => {
        const da = a.published_at ?? a.discovered_at;
        const db = b.published_at ?? b.discovered_at;
        return new Date(db).getTime() - new Date(da).getTime();
      })
      .slice(0, 6);
  }, [result]);

  const remote = useMemo(() => {
    if (!result) return [] as Job[];
    return result.jobs.filter((j) => j.remote_status === "remote").slice(0, 6);
  }, [result]);

  const allIds = useMemo(
    () => new Set([...newest, ...remote].map((j) => j.id)),
    [newest, remote],
  );
  const allRest = useMemo(
    () => (result ? result.jobs.filter((j) => !allIds.has(j.id)) : []),
    [result, allIds],
  );

  async function discover() {
    setLoading(true);
    setError(null);
    try {
      const lines = customQueries
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 6);
      const body: { queries?: string[] } = {};
      if (lines.length) body.queries = lines;

      const res = await fetch("/api/jobs/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (payload as { error?: string }).error ?? "Discovery failed",
        );
      }
      const data = (payload as { data: DiscoverResponse }).data;
      setResult(data);
      if (data.used_mock) {
        toast({
          title: "Demo data",
          description:
            "Showing demo data — configure job provider API keys for real results.",
        });
      }
      if (!data.jobs.length) {
        toast({
          title: "No jobs found",
          description: "Try again later or add custom queries.",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Discovery failed";
      setError(msg);
      toast({
        title: "Discovery failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Job Discovery</h1>
        <p className="mt-1 text-muted-foreground">
          Let StackScout AI generate search queries from your profile and scan
          job providers for you.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Discover opportunities
          </CardTitle>
          <CardDescription>
            We'll build queries from your resume and candidate profile, then
            search across all providers. This can take 10–30 seconds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="custom-queries">
              Custom queries (optional, one per line, max 6)
            </Label>
            <Textarea
              id="custom-queries"
              placeholder={
                "senior react developer remote\nbackend engineer fintech\nfull stack developer $100k"
              }
              value={customQueries}
              onChange={(e) => setCustomQueries(e.target.value)}
              rows={4}
              disabled={loading}
            />
            {(() => {
              const count = customQueries
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean).length;
              return count > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {count} quer{count === 1 ? "y" : "ies"} detected (max 6 used)
                </p>
              ) : null;
            })()}
          </div>
          <Button onClick={() => void discover()} disabled={loading} size="lg">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {loading ? "Discovering jobs..." : "Discover Jobs"}
          </Button>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-medium">Searching across job providers...</p>
            <p className="text-sm text-muted-foreground">
              Generating queries and checking each provider. This usually takes
              10–30 seconds.
            </p>
          </CardContent>
        </Card>
      )}

      {error && !loading && (
        <Card>
          <CardContent className="flex items-center gap-2 py-6 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </CardContent>
        </Card>
      )}

      {result && !loading && (
        <>
          {result.used_mock && (
            <div className="rounded-md border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
              Showing demo data — configure job provider API keys for real
              results.
            </div>
          )}

          {result.generated_queries.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Generated search queries
                </CardTitle>
                <CardDescription>
                  Queries AI derived from your profile to power this discovery
                  run.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {result.generated_queries.map((g) => (
                  <div key={g.query} className="rounded-md border p-3">
                    <p className="text-sm font-medium">{g.query}</p>
                    {g.rationale && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {g.rationale}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {result.jobs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
                <Briefcase className="h-10 w-10 text-muted-foreground" />
                <p className="font-medium">No jobs discovered</p>
                <p className="text-sm text-muted-foreground">
                  Providers returned no results. Try again later or provide
                  custom queries above.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {newest.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-lg font-semibold">Newest</h2>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {newest.map((job) => (
                      <JobCard key={`newest-${job.id}`} job={job} />
                    ))}
                  </div>
                </section>
              )}

              {remote.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-lg font-semibold">
                    Remote opportunities
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {remote.map((job) => (
                      <JobCard key={`remote-${job.id}`} job={job} />
                    ))}
                  </div>
                </section>
              )}

              {allRest.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-lg font-semibold">All discovered</h2>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {allRest.map((job) => (
                      <JobCard key={`all-${job.id}`} job={job} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {result.providers.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Provider status</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {result.providers.map((p) => (
                  <Badge
                    key={p.name}
                    variant={
                      p.error
                        ? "destructive"
                        : p.mocked
                          ? "warning"
                          : "secondary"
                    }
                    className="capitalize"
                  >
                    {p.name}: {p.error ? p.error : `${p.count} jobs`}
                    {p.mocked ? " · demo" : ""}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!result && !loading && (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Bookmark, ExternalLink, Send, Trash2 } from "lucide-react";

type Job = {
  id: string; title: string; company: string; location: string | null;
  remote_status: string | null; employment_type: string | null;
  salary_min: number | null; salary_max: number | null; salary_currency: string | null;
  salary_period: string | null; experience_level: string | null;
  application_url: string | null; source_name: string | null;
  published_at: string | null; required_skills: string[] | null;
};

type SavedJob = { id: string; job_id: string; notes: string | null; created_at: string; jobs: Job | null };

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body;
}

export default function SavedJobsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<SavedJob[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const body = await apiFetch("/api/saved-jobs");
      setItems(body.data.saved_jobs ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load saved jobs");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function track(sj: SavedJob) {
    setBusyId(sj.job_id);
    try {
      await apiFetch("/api/applications", { method: "POST", body: JSON.stringify({ job_id: sj.job_id, status: "saved", notes: sj.notes ?? undefined }) });
      toast({ title: "Added to applications", description: "Track it from your Applications page." });
    } catch (e) {
      toast({ title: "Failed to track", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally { setBusyId(null); }
  }

  async function remove(sj: SavedJob) {
    setBusyId(sj.job_id);
    try {
      await apiFetch(`/api/saved-jobs?job_id=${sj.job_id}`, { method: "DELETE" });
      setItems((prev) => (prev ?? []).filter((x) => x.id !== sj.id));
      toast({ title: "Removed from saved jobs" });
    } catch (e) {
      toast({ title: "Remove failed", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally { setBusyId(null); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Saved Jobs</h1>
        <p className="text-muted-foreground text-sm">Jobs you bookmarked for later.</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {items === null && !error && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56" />)}</div>
      )}
      {items !== null && items.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Bookmark className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium text-foreground">No saved jobs</p>
          <p className="text-sm mt-1">Save jobs while browsing to find them here later.</p>
          <Link href="/dashboard/discover" className="text-sm text-primary hover:underline">Discover jobs</Link>
        </CardContent></Card>
      )}

      {items !== null && items.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((sj) => {
            const j = sj.jobs;
            return (
              <Card key={sj.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base leading-snug line-clamp-2">{j?.title ?? "Job no longer available"}</CardTitle>
                  <p className="text-sm text-muted-foreground">{j?.company ?? "Unknown company"}</p>
                </CardHeader>
                <CardContent className="flex-1 space-y-2 text-sm">
                  {j ? (
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        {j.remote_status && <Badge variant="secondary">{j.remote_status}</Badge>}
                        {j.employment_type && <Badge variant="outline">{j.employment_type}</Badge>}
                        {j.experience_level && <Badge variant="outline">{j.experience_level}</Badge>}
                      </div>
                      {(j.location || j.salary_min != null) && (
                        <p className="text-xs text-muted-foreground">
                          {[j.location, j.salary_min != null ? `${(j.salary_currency ?? "")}${j.salary_min.toLocaleString()}–${j.salary_max?.toLocaleString() ?? ""} ${j.salary_period ?? ""}`.trim() : null].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {j.required_skills && j.required_skills.length > 0 && (
                        <p className="text-xs text-muted-foreground line-clamp-2">Skills: {j.required_skills.slice(0, 6).join(", ")}{j.required_skills.length > 6 ? "…" : ""}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">The linked job record is missing.</p>
                  )}
                  {sj.notes && (
                    <p className="text-xs bg-muted rounded p-2">
                      <span className="font-medium">Note:</span> {sj.notes}
                    </p>
                  )}
                  {!sj.notes && <p className="text-[11px] text-muted-foreground">Notes are set when saving a job and can't be edited here.</p>}
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2 pt-2">
                  {j && (
                    <>
                      <Link href={`/dashboard/jobs/${j.id}`}><Button size="sm" variant="outline">View job</Button></Link>
                      {j.application_url && (
                        <a href={j.application_url} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline"><ExternalLink className="mr-1 h-3.5 w-3.5" />Apply</Button>
                        </a>
                      )}
                      <Button size="sm" variant="secondary" disabled={busyId === j.id} onClick={() => track(sj)}>
                        <Send className="mr-1 h-3.5 w-3.5" />Track application
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive ml-auto" disabled={busyId === sj.job_id} onClick={() => remove(sj)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
